import { instanceAiEventSchema, type InstanceAiEvent } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { saveWorkflowSourceFileBinding } from '../workflow-file-bindings';
import {
	createContextWorkflowDraftSources,
	createWorkflowDraftPreviewer,
	type WorkflowDraftSources,
} from '../workflow-draft-previewer';

const FILE = 'src/workflows/demo.workflow.ts';

function source(name: string) {
	return `import { workflow, node, trigger } from '@n8n/workflow-sdk';

const start = trigger({
	type: 'n8n-nodes-base.manualTrigger',
	version: 1,
	config: { name: 'Start' },
});

export default workflow('wf', '${name}').add(start).to(
	node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Set', parameters: {} } }),
);
`;
}

const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function setup(sources: Partial<WorkflowDraftSources> = {}) {
	const published: InstanceAiEvent[] = [];
	const resolvedSources: WorkflowDraftSources = {
		readSource: vi.fn(async () => await Promise.resolve(source('Read from disk'))),
		findBoundWorkflowId: vi.fn(async () => await Promise.resolve(undefined)),
		prepareLikeSave: vi.fn(async () => await Promise.resolve()),
		...sources,
	};
	const previewer = createWorkflowDraftPreviewer({
		eventBus: { publish: (_threadId, event) => published.push(event) },
		threadId: 'thread-1',
		runId: 'run-1',
		agentId: 'agent-1',
		logger,
		sources: resolvedSources,
	});
	return { previewer, published, sources: resolvedSources };
}

function toolCall(toolCallId: string, toolName: string, args: Record<string, unknown>) {
	return {
		type: 'tool-call',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: { toolCallId, toolName, args },
	} satisfies InstanceAiEvent;
}

function toolResult(toolCallId: string, result: unknown) {
	return {
		type: 'tool-result',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: { toolCallId, result },
	} satisfies InstanceAiEvent;
}

function drafts(published: InstanceAiEvent[]) {
	return published.flatMap((event) => (event.type === 'workflow-draft' ? [event] : []));
}

async function flush() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('createWorkflowDraftPreviewer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('publishes a draft from the content of a successful file write', async () => {
		const { previewer, published, sources } = setup();

		previewer.observe(
			toolCall('tc-1', 'workspace_write_file', { path: FILE, content: source('Written') }),
		);
		previewer.observe(toolResult('tc-1', { success: true }));

		await vi.waitFor(() => expect(drafts(published)).toHaveLength(1));
		const [draft] = drafts(published);
		expect(instanceAiEventSchema.safeParse(draft).success).toBe(true);
		expect(draft.payload).toMatchObject({ filePath: FILE, revision: 1 });
		expect(draft.payload.workflow.name).toBe('Written');
		expect(draft.payload.workflow.nodes.map((node) => node.name)).toEqual(['Start', 'Set']);
		expect(sources.readSource).not.toHaveBeenCalled();
	});

	it('keeps the node groups the source declares', async () => {
		const { previewer, published } = setup();
		const grouped = source('Grouped').replace(
			"version: 3.4, config: { name: 'Set', parameters: {} } }),\n);",
			"version: 3.4, config: { name: 'Set', parameters: {} } }),\n).group('Intake', [start], { description: 'Reads the input' });",
		);
		expect(grouped).toContain('.group(');

		previewer.observe(toolCall('tc-1', 'workspace_write_file', { path: FILE, content: grouped }));
		previewer.observe(toolResult('tc-1', { success: true }));

		await vi.waitFor(() => expect(drafts(published)).toHaveLength(1));
		expect(drafts(published)[0].payload.workflow.nodeGroups).toEqual([
			expect.objectContaining({
				name: 'Intake',
				description: 'Reads the input',
				nodeIds: [expect.any(String)],
			}),
		]);
	});

	it('reads the file after a successful string replacement', async () => {
		const { previewer, published, sources } = setup();

		previewer.observe(toolCall('tc-1', 'workspace_str_replace_file', { path: FILE }));
		previewer.observe(toolResult('tc-1', { success: true }));

		await vi.waitFor(() => expect(drafts(published)).toHaveLength(1));
		expect(sources.readSource).toHaveBeenCalledWith(FILE);
		expect(drafts(published)[0].payload.workflow.name).toBe('Read from disk');
	});

	it('publishes inline build source as soon as the build starts', async () => {
		const { previewer, published } = setup();

		previewer.observe(
			toolCall('tc-1', 'workflow_builder_build_workflow', {
				filePath: FILE,
				sourceCode: source('Inline'),
			}),
		);

		await vi.waitFor(() => expect(drafts(published)).toHaveLength(1));
		expect(drafts(published)[0].payload.workflow.name).toBe('Inline');
	});

	it('does not publish a build that has no inline source', async () => {
		const { previewer, published } = setup();

		previewer.observe(
			toolCall('tc-1', 'workflow_builder_build_workflow', { filePath: FILE, sourceCode: '' }),
		);
		await flush();

		expect(drafts(published)).toHaveLength(0);
	});

	it('does not publish when the write fails', async () => {
		const { previewer, published } = setup();

		previewer.observe(toolCall('tc-1', 'workspace_str_replace_file', { path: FILE }));
		previewer.observe(toolResult('tc-1', { success: false, error: 'No match' }));
		previewer.observe(toolCall('tc-2', 'workspace_str_replace_file', { path: FILE }));
		previewer.observe({
			type: 'tool-error',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { toolCallId: 'tc-2', error: 'boom' },
		});
		await flush();

		expect(drafts(published)).toHaveLength(0);
	});

	it('does not publish when the source does not parse', async () => {
		const { previewer, published } = setup({
			readSource: vi.fn(async () => await Promise.resolve('export default workflow(')),
		});

		previewer.observe(toolCall('tc-1', 'workspace_str_replace_file', { path: FILE }));
		previewer.observe(toolResult('tc-1', { success: true }));
		await flush();

		expect(drafts(published)).toHaveLength(0);
	});

	it('ignores writes to files that are not workflow sources', async () => {
		const { previewer, published, sources } = setup();

		previewer.observe(toolCall('tc-1', 'workspace_str_replace_file', { path: 'README.md' }));
		previewer.observe(toolResult('tc-1', { success: true }));
		await flush();

		expect(sources.readSource).not.toHaveBeenCalled();
		expect(drafts(published)).toHaveLength(0);
	});

	it('aligns a bound workflow with its saved layout and names it', async () => {
		const prepareLikeSave = vi.fn(async (json: WorkflowJSON) => {
			json.nodes[0].position = [999, 999];
			await Promise.resolve();
		});
		const { previewer, published } = setup({
			findBoundWorkflowId: vi.fn(async () => await Promise.resolve('wf-saved')),
			prepareLikeSave,
		});

		previewer.observe(toolCall('tc-1', 'workspace_str_replace_file', { path: FILE }));
		previewer.observe(toolResult('tc-1', { success: true }));

		await vi.waitFor(() => expect(drafts(published)).toHaveLength(1));
		const [draft] = drafts(published);
		expect(draft.payload.workflowId).toBe('wf-saved');
		expect(prepareLikeSave).toHaveBeenCalledWith(expect.anything(), 'wf-saved');
		expect(draft.payload.workflow.nodes[0].position).toEqual([999, 999]);
	});

	it('prepares an unbound draft the way the save would', async () => {
		const { previewer, published, sources } = setup();

		previewer.observe(toolCall('tc-1', 'workspace_str_replace_file', { path: FILE }));
		previewer.observe(toolResult('tc-1', { success: true }));

		await vi.waitFor(() => expect(drafts(published)).toHaveLength(1));
		expect(sources.prepareLikeSave).toHaveBeenCalledWith(expect.anything(), undefined);
	});

	it('drops a draft that a newer write of the same file overtook', async () => {
		let releaseFirstRead: (value: string) => void = () => {};
		const readSource = vi
			.fn<WorkflowDraftSources['readSource']>()
			.mockImplementationOnce(
				async () => await new Promise<string>((resolve) => (releaseFirstRead = resolve)),
			)
			.mockImplementationOnce(async () => await Promise.resolve(source('Second')));
		const { previewer, published } = setup({ readSource });

		previewer.observe(toolCall('tc-1', 'workspace_str_replace_file', { path: FILE }));
		previewer.observe(toolResult('tc-1', { success: true }));
		previewer.observe(toolCall('tc-2', 'workspace_str_replace_file', { path: FILE }));
		previewer.observe(toolResult('tc-2', { success: true }));
		await vi.waitFor(() => expect(drafts(published)).toHaveLength(1));
		releaseFirstRead(source('First'));
		await flush();

		expect(drafts(published)).toHaveLength(1);
		expect(drafts(published)[0].payload).toMatchObject({ revision: 2 });
		expect(drafts(published)[0].payload.workflow.name).toBe('Second');
	});
});

describe('createContextWorkflowDraftSources', () => {
	function makeContext(overrides: Partial<InstanceAiContext> = {}) {
		return {
			logger: { debug: vi.fn(), warn: vi.fn() },
			...overrides,
		} as unknown as InstanceAiContext;
	}

	it('reads nothing when the context has no workspace', async () => {
		const sources = createContextWorkflowDraftSources(makeContext());

		await expect(sources.readSource(FILE)).resolves.toBeNull();
	});

	it('reads the source from the workspace filesystem', async () => {
		const readFile = vi.fn().mockResolvedValue('content');
		const sources = createContextWorkflowDraftSources(
			makeContext({
				workspace: { filesystem: { readFile } },
			} as unknown as Partial<InstanceAiContext>),
		);

		await expect(sources.readSource(FILE)).resolves.toBe('content');
	});

	it('finds the workflow a source file is bound to', async () => {
		const context = makeContext();
		await saveWorkflowSourceFileBinding(context, { filePath: FILE, workflowId: 'wf-1' });

		await expect(
			createContextWorkflowDraftSources(context).findBoundWorkflowId(FILE),
		).resolves.toBe('wf-1');
	});

	it('drops the groups that the save would drop', async () => {
		const draft: WorkflowJSON = {
			name: 'Draft',
			nodes: [
				{
					id: 'start',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			nodeGroups: [{ id: 'g-1', name: 'Ghost', nodeIds: ['missing-node'] }],
		};

		await createContextWorkflowDraftSources(makeContext()).prepareLikeSave(draft, undefined);

		expect(draft.nodeGroups ?? []).toHaveLength(0);
	});

	it('moves surviving nodes to their saved positions', async () => {
		const saved = {
			name: 'Saved',
			nodes: [
				{
					id: 'saved-start',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [400, 300],
					parameters: {},
				},
			],
			connections: {},
		};
		const context = makeContext({
			workflowService: { getAsWorkflowJSON: vi.fn().mockResolvedValue(saved) },
		} as unknown as Partial<InstanceAiContext>);
		const draft: WorkflowJSON = {
			name: 'Draft',
			nodes: [
				{
					id: 'draft-start',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};

		await createContextWorkflowDraftSources(context).prepareLikeSave(draft, 'wf-1');

		expect(draft.nodes[0].position).toEqual([400, 300]);
	});
});
