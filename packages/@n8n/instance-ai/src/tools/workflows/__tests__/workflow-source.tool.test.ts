import { z } from 'zod';

import { executeTool } from '../../../__tests__/tool-test-utils';
import { InMemoryWorkflowSourceArtifactStore, hashWorkflowSource } from '../../../storage';
import type { InstanceAiContext } from '../../../types';
import { createWorkflowSourceTool } from '../workflow-source.tool';

type WorkflowSourceToolOutput = {
	success: boolean;
	sourceRef: string;
	filePath: string;
	sourceHash?: string;
	workflowId?: string;
	workflowName?: string;
	errors?: string[];
};

vi.mock('@n8n/workflow-sdk', () => ({
	generateWorkflowCode: vi.fn(() => 'generated workflow code'),
}));

function makeContext(overrides: Partial<InstanceAiContext> = {}) {
	const files = new Map<string, string>();
	const store = new InMemoryWorkflowSourceArtifactStore();
	const context = {
		userId: 'user-1',
		runId: 'run-1',
		workflowService: {
			getWorkflowSnapshot: vi.fn(
				async () =>
					await Promise.resolve({
						json: { name: 'Existing workflow', nodes: [], connections: {} },
						versionId: 'v-existing',
						updatedAt: 1,
					}),
			),
		},
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
		workflowSourceArtifactStore: store,
		logger: { warn: vi.fn(), debug: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;

	return { context, files, store };
}

describe('createWorkflowSourceTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('exposes a top-level object input schema for Anthropic', () => {
		const { context } = makeContext();
		const tool = createWorkflowSourceTool(context);

		expect((tool as { inputSchema: unknown }).inputSchema).toBeInstanceOf(z.ZodObject);
	});

	it('rejects malformed non-create action payloads after schema sanitization', async () => {
		const { context } = makeContext();

		const result = await executeTool<{ success: boolean; errors?: string[] }>(
			createWorkflowSourceTool(context),
			{ action: 'hydrate-from-workflow' },
		);

		expect(result.success).toBe(false);
		expect(result.errors).toContain('Required');
	});

	it('rejects obsolete inline source fields after schema sanitization', async () => {
		const { context } = makeContext();

		const result = await executeTool<{ success: boolean; errors?: string[] }>(
			createWorkflowSourceTool(context),
			{
				action: 'create',
				workItemId: 'wi-1',
				code: 'export default workflow("id", "obsolete")',
			},
		);

		expect(result.success).toBe(false);
		expect(result.errors?.join('\n')).toContain("Unrecognized key(s) in object: 'code'");
	});

	it('creates a source artifact and workspace file for a new workflow', async () => {
		const { context, files, store } = makeContext({
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
			},
		});

		const result = await executeTool<WorkflowSourceToolOutput>(createWorkflowSourceTool(context), {
			action: 'create',
			workItemId: 'wi-1',
			workflowName: 'New workflow',
		});
		const artifact = await store.getBySourceRef(result.sourceRef);

		expect(result).toMatchObject({
			success: true,
			filePath: 'src/workflows/task-1/main.workflow.ts',
			workflowName: 'New workflow',
		});
		expect(files.get(result.filePath)).toContain(`sourceRef: ${result.sourceRef}`);
		expect(artifact).toMatchObject({
			sourceRef: result.sourceRef,
			workItemId: 'wi-1',
			taskId: 'task-1',
			workflowName: 'New workflow',
			sourceHash: hashWorkflowSource(files.get(result.filePath) ?? ''),
		});
		expect(files.has('src/workflows/task-1/main.metadata.json')).toBe(true);
	});

	it('derives workItemId for new workflow source creation from build context', async () => {
		const { context, store } = makeContext({
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				workItemId: 'wi-from-context',
				taskId: 'build-run_abc123',
			},
		});

		const result = await executeTool<WorkflowSourceToolOutput>(createWorkflowSourceTool(context), {
			action: 'create',
			workflowName: 'WhatsApp Knowledge Base Agent',
		});
		const artifact = await store.getBySourceRef(result.sourceRef);

		expect(result).toMatchObject({
			success: true,
			filePath: 'src/workflows/build-run_abc123/main.workflow.ts',
			metadataFilePath: 'src/workflows/build-run_abc123/main.metadata.json',
			workflowName: 'WhatsApp Knowledge Base Agent',
		});
		expect(artifact).toMatchObject({
			workItemId: 'wi-from-context',
			taskId: 'build-run_abc123',
		});
	});

	it('derives workItemId from taskId when create omits workItemId', async () => {
		const { context, store } = makeContext();

		const result = await executeTool<WorkflowSourceToolOutput>(createWorkflowSourceTool(context), {
			action: 'create',
			taskId: 'wa-kb-agent',
			workflowName: 'WhatsApp Knowledge Base Agent',
		});
		const artifact = await store.getBySourceRef(result.sourceRef);

		expect(result).toMatchObject({
			success: true,
			filePath: 'src/workflows/wa-kb-agent/main.workflow.ts',
			metadataFilePath: 'src/workflows/wa-kb-agent/main.metadata.json',
		});
		expect(artifact).toMatchObject({
			workItemId: 'wa-kb-agent',
			taskId: 'wa-kb-agent',
		});
	});

	it('creates a supporting workflow source file under the task directory', async () => {
		const { context } = makeContext({
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-supporting',
			},
		});

		const result = await executeTool<WorkflowSourceToolOutput>(createWorkflowSourceTool(context), {
			action: 'create',
			workItemId: 'wi-supporting',
			isSupportingWorkflow: true,
		});

		expect(result).toMatchObject({
			success: true,
			filePath: 'src/workflows/task-1/supporting-wi-supporting.workflow.ts',
			metadataFilePath: 'src/workflows/task-1/supporting-wi-supporting.metadata.json',
		});
	});

	it('hydrates source from an existing workflow and binds workflow identity', async () => {
		const { context, files, store } = makeContext({
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-existing',
			},
		});

		const result = await executeTool<WorkflowSourceToolOutput>(createWorkflowSourceTool(context), {
			action: 'hydrate-from-workflow',
			workflowId: 'wf-existing',
			workItemId: 'wi-existing',
		});
		const artifact = await store.getBySourceRef(result.sourceRef);

		expect(context.workflowService.getWorkflowSnapshot).toHaveBeenCalledWith('wf-existing');
		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-existing',
			workflowName: 'Existing workflow',
		});
		expect(files.get(result.filePath)).toContain('generated workflow code');
		expect(artifact).toMatchObject({
			workflowId: 'wf-existing',
			workflowVersionId: 'v-existing',
			sourceHash: hashWorkflowSource(files.get(result.filePath) ?? ''),
		});
	});

	it('refreshes sourceHash when getting an edited source artifact', async () => {
		const { context, files } = makeContext({
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
			},
		});
		const tool = createWorkflowSourceTool(context);
		const created = await executeTool<WorkflowSourceToolOutput>(tool, {
			action: 'create',
			workItemId: 'wi-1',
		});
		files.set(created.filePath, 'edited source');

		const result = await executeTool<WorkflowSourceToolOutput>(tool, {
			action: 'get',
			sourceRef: created.sourceRef,
		});

		expect(result).toMatchObject({
			success: true,
			sourceRef: created.sourceRef,
			sourceHash: hashWorkflowSource('edited source'),
		});
	});
});
