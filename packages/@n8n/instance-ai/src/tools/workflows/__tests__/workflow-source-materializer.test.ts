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
	it('reports the source line of each node, located by its emitted id', () => {
		const json: WorkflowJSON = {
			name: 'W',
			nodes: [
				{
					id: 'n1',
					name: 'First',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'n2',
					name: 'Second',
					type: 'n8n-nodes-base.if',
					typeVersion: 2.2,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};
		const code = [
			"import { node } from '@n8n/workflow-sdk';",
			'',
			'const first = node({',
			"  config: { id: 'n1', name: 'First' }",
			'});',
			"const second = node({ config: { id: 'n2', name: 'Second' } });",
		].join('\n');

		expect(indexSourceNodes(json, code)).toEqual([
			{ name: 'First', type: 'n8n-nodes-base.set', line: 4 },
			{ name: 'Second', type: 'n8n-nodes-base.if', line: 6 },
		]);
	});

	it('falls back to the node head that declares the name when the id is not emitted', () => {
		const json: WorkflowJSON = {
			name: 'W',
			nodes: [
				{
					id: 'dup',
					name: 'carrier',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};
		// An earlier root node carries the same text as a parameter key, on its
		// single-line config — shallower than the nested subnode declared later.
		const code = [
			'const other = node({',
			"  config: { id: 'x', name: 'Other', parameters: { assignments: [{ name: 'carrier', value: 'dhl' }] } }",
			'});',
			'const agent = node({',
			'  config: {',
			"    id: 'a',",
			"    name: 'Agent',",
			"    subnodes: { tools: [tool({ type: 't', version: 1, config: { name: 'carrier', parameters: { x: 1 } } })] }",
			'  }',
			'});',
		].join('\n');

		expect(indexSourceNodes(json, code)).toEqual([
			{ name: 'carrier', type: 'n8n-nodes-base.set', line: 8 },
		]);
	});

	it('finds a multi-line config head with the name after the id line', () => {
		const json: WorkflowJSON = {
			name: 'W',
			nodes: [
				{
					id: 'dup',
					name: 'Send',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};
		const code = [
			'const send = node({',
			'  config: {',
			"    id: 'other-id',",
			"    name: 'Send',",
			'    parameters: { jsonBody: expr(`{\n  "name": "Send"\n}`) }',
			'  }',
			'});',
		].join('\n');

		expect(indexSourceNodes(json, code)).toEqual([
			{ name: 'Send', type: 'n8n-nodes-base.httpRequest', line: 4 },
		]);
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
