import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import {
	getWorkflowSourceFileBinding,
	hashWorkflowSource,
	saveWorkflowSourceFileBinding,
} from '../workflow-file-bindings';
import {
	indexSourceNodes,
	materializeWorkflowSource,
	workflowSourceFileSlug,
} from '../workflow-source-materializer';

function createContext(files: Map<string, string>): InstanceAiContext {
	return {
		userId: 'user-1',
		permissions: {},
		logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
		workspace: {
			filesystem: {
				readFile: vi.fn(async (path: string) => {
					const content = files.get(path);
					if (content === undefined) throw new Error(`ENOENT ${path}`);
					return await Promise.resolve(content);
				}),
				writeFile: vi.fn(async (path: string, content: string | Buffer) => {
					files.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
					await Promise.resolve();
				}),
			},
		},
	} as unknown as InstanceAiContext;
}

const CODE_V1 =
	"const a = node({ config: { id: 'n1', name: 'A' } });\nexport default workflow('w', 'W');";
const CODE_V2 =
	"const a = node({ config: { id: 'n1', name: 'A (renamed)' } });\nexport default workflow('w', 'W');";

describe('workflowSourceFileSlug', () => {
	it('derives a kebab-case file name from the workflow name', () => {
		expect(workflowSourceFileSlug('Regional order dispatch (pilot regions)', 'wf1')).toBe(
			'regional-order-dispatch-pilot-regions',
		);
	});

	it('falls back to the workflow id when the name has no usable characters', () => {
		expect(workflowSourceFileSlug('🚀🚀', 'AbC123')).toBe('abc123');
	});

	it('sanitizes a path-shaped id used as the fallback', () => {
		expect(workflowSourceFileSlug('', '../etc/passwd')).toBe('etc-passwd');
		expect(workflowSourceFileSlug('', '///')).toBe('workflow');
	});
});

describe('indexSourceNodes', () => {
	type NodeJson = NonNullable<WorkflowJSON['nodes']>[number];
	const nodeJson = (id: string, name: string, type = 'n8n-nodes-base.set'): NodeJson => ({
		id,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});
	const withNodes = (...nodes: NodeJson[]): WorkflowJSON => ({ name: 'W', nodes, connections: {} });

	it('reports the line of each node declaration', async () => {
		const code = [
			"import { node, workflow } from '@n8n/workflow-sdk';",
			'',
			'const first = node({',
			"  type: 'n8n-nodes-base.set',",
			'  version: 3.4,',
			"  config: { id: 'n1', name: 'First' }",
			'});',
			"const second = node({ type: 'n8n-nodes-base.if', version: 2.2, config: { id: 'n2', name: 'Second' } });",
			"export default workflow('w', 'W').add(first).to(second);",
		].join('\n');
		const json = withNodes(nodeJson('n1', 'First'), nodeJson('n2', 'Second', 'n8n-nodes-base.if'));

		await expect(indexSourceNodes(json, code)).resolves.toEqual([
			{ name: 'First', type: 'n8n-nodes-base.set', line: 3 },
			{ name: 'Second', type: 'n8n-nodes-base.if', line: 8 },
		]);
	});

	it('locates a node by name when its id is emitted for another node, ignoring the name in values', async () => {
		// Codegen emits the shared id once. The second node's name also appears as a
		// parameter key on the first node and inside the sticky note's content.
		const code = [
			"const first = node({ type: 't', version: 1, config: { id: 'shared', name: 'First', parameters: { assignments: [{ name: 'Second' }] } } });",
			'const second = node({',
			"  type: 't',",
			'  version: 1,',
			"  config: { name: 'Second' }",
			'});',
			"export default workflow('w', 'W').add(first).to(second).add(sticky(`# Notes",
			"], { name: 'Second'",
			"`, [], { name: 'Notes' }));",
		].join('\n');
		const json = withNodes(
			nodeJson('shared', 'First'),
			nodeJson('shared', 'Second'),
			nodeJson('note', 'Notes', 'n8n-nodes-base.stickyNote'),
		);

		await expect(indexSourceNodes(json, code)).resolves.toEqual([
			{ name: 'First', type: 'n8n-nodes-base.set', line: 1 },
			{ name: 'Second', type: 'n8n-nodes-base.set', line: 2 },
			{ name: 'Notes', type: 'n8n-nodes-base.stickyNote', line: 7 },
		]);
	});

	it('falls back to a unique id when the file renamed the node', async () => {
		const code =
			"const a = node({ type: 't', version: 1, config: { id: 'n1', name: 'Renamed' } });";

		await expect(indexSourceNodes(withNodes(nodeJson('n1', 'Original')), code)).resolves.toEqual([
			{ name: 'Original', type: 'n8n-nodes-base.set', line: 1 },
		]);
	});

	it('reports line 0 for a node the source does not declare, or when the source does not parse', async () => {
		const json = withNodes(nodeJson('n1', 'Missing'));
		const expected = [{ name: 'Missing', type: 'n8n-nodes-base.set', line: 0 }];

		await expect(
			indexSourceNodes(
				json,
				"const a = node({ type: 't', version: 1, config: { id: 'x', name: 'Other' } });",
			),
		).resolves.toEqual(expected);
		await expect(
			indexSourceNodes(json, "const a = node({ config: { id: 'n1', name: 'Missing' }"),
		).resolves.toEqual(expected);
	});
});

describe('materializeWorkflowSource', () => {
	it('writes the file under src/workflows and binds it to the workflow', async () => {
		const files = new Map<string, string>();
		const context = createContext(files);

		const result = await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'Order Dispatch',
			code: CODE_V1,
			saved: { versionId: 'v1', checksum: 'c1' },
		});

		expect(result).toEqual({
			filePath: 'src/workflows/order-dispatch.workflow.ts',
			status: 'written',
			sourceHash: hashWorkflowSource(CODE_V1),
			content: CODE_V1,
		});
		expect(files.get('src/workflows/order-dispatch.workflow.ts')).toBe(CODE_V1);
		await expect(
			getWorkflowSourceFileBinding(context, 'src/workflows/order-dispatch.workflow.ts'),
		).resolves.toEqual({
			filePath: 'src/workflows/order-dispatch.workflow.ts',
			workflowId: 'wf1',
			workflowVersionId: 'v1',
			workflowChecksum: 'c1',
			sourceHash: hashWorkflowSource(CODE_V1),
		});
	});

	it('reports the file as current and writes nothing when neither side changed', async () => {
		const files = new Map<string, string>();
		const context = createContext(files);
		const saved = { versionId: 'v1', checksum: 'c1' };
		await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'W',
			code: CODE_V1,
			saved,
		});
		const writeFile = context.workspace?.filesystem?.writeFile as ReturnType<typeof vi.fn>;
		writeFile.mockClear();

		const result = await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'W',
			code: CODE_V1,
			saved,
		});

		expect(result.status).toBe('current');
		expect(writeFile).not.toHaveBeenCalled();
	});

	it('regenerates the file when the saved workflow changed and the file has no local edits', async () => {
		const files = new Map<string, string>();
		const context = createContext(files);
		await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'W',
			code: CODE_V1,
			saved: { versionId: 'v1', checksum: 'c1' },
		});

		const result = await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'W',
			code: CODE_V2,
			saved: { versionId: 'v2', checksum: 'c2' },
		});

		expect(result.status).toBe('refreshed');
		expect(files.get('src/workflows/w.workflow.ts')).toBe(CODE_V2);
		await expect(
			getWorkflowSourceFileBinding(context, 'src/workflows/w.workflow.ts'),
		).resolves.toMatchObject({ workflowChecksum: 'c2', sourceHash: hashWorkflowSource(CODE_V2) });
	});

	it('leaves a file with unbuilt edits alone and reports a conflict', async () => {
		const files = new Map<string, string>();
		const context = createContext(files);
		await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'W',
			code: CODE_V1,
			saved: { versionId: 'v1', checksum: 'c1' },
		});
		const edited = CODE_V1.replace("name: 'A'", "name: 'A edited'");
		files.set('src/workflows/w.workflow.ts', edited);

		const result = await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'W',
			code: CODE_V2,
			saved: { versionId: 'v2', checksum: 'c2' },
		});

		expect(result.status).toBe('conflict');
		expect(files.get('src/workflows/w.workflow.ts')).toBe(edited);
		await expect(
			getWorkflowSourceFileBinding(context, 'src/workflows/w.workflow.ts'),
		).resolves.toMatchObject({ workflowChecksum: 'c1' });
	});

	it('reuses the path the workflow is already bound to', async () => {
		const files = new Map<string, string>();
		const context = createContext(files);
		await saveWorkflowSourceFileBinding(context, {
			filePath: 'src/workflows/main.workflow.ts',
			workflowId: 'wf1',
		});

		const result = await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'Some Other Name',
			code: CODE_V1,
			saved: { versionId: 'v1', checksum: 'c1' },
		});

		expect(result.filePath).toBe('src/workflows/main.workflow.ts');
		expect(files.has('src/workflows/main.workflow.ts')).toBe(true);
	});

	it('picks a distinct path when the slug is bound to another workflow', async () => {
		const files = new Map<string, string>();
		const context = createContext(files);
		await saveWorkflowSourceFileBinding(context, {
			filePath: 'src/workflows/w.workflow.ts',
			workflowId: 'other',
		});

		const result = await materializeWorkflowSource(context, {
			workflowId: 'AbCdEfGh',
			name: 'W',
			code: CODE_V1,
			saved: { versionId: 'v1' },
		});

		expect(result.filePath).toBe('src/workflows/w-abcdefgh.workflow.ts');
	});

	it('does not overwrite a file at the slug path that this thread never bound', async () => {
		const files = new Map<string, string>([
			['src/workflows/w.workflow.ts', '// agent-written draft'],
		]);
		const context = createContext(files);

		const result = await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'W',
			code: CODE_V1,
			saved: { versionId: 'v1', checksum: 'c1' },
		});

		expect(result.status).toBe('conflict');
		expect(result.content).toBe('// agent-written draft');
		expect(files.get('src/workflows/w.workflow.ts')).toBe('// agent-written draft');
	});

	it('rewrites an unedited file when codegen output changed for the same saved workflow', async () => {
		const files = new Map<string, string>();
		const context = createContext(files);
		const saved = { versionId: 'v1', checksum: 'c1' };
		await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'W',
			code: CODE_V1,
			saved,
		});

		const result = await materializeWorkflowSource(context, {
			workflowId: 'wf1',
			name: 'W',
			code: CODE_V2,
			saved,
		});

		expect(result.status).toBe('refreshed');
		expect(files.get('src/workflows/w.workflow.ts')).toBe(CODE_V2);
	});
});
