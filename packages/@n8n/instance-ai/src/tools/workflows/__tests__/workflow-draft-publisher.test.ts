import { instanceAiEventSchema, type InstanceAiEvent } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { createWorkflowDraftPublisher } from '../workflow-draft-publisher';

const FILE = 'src/workflows/demo.workflow.ts';

function compiledWorkflow(overrides: Partial<WorkflowJSON> = {}): WorkflowJSON {
	return {
		name: 'Demo',
		nodes: [
			{
				id: 'start',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'set',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [200, 0],
				parameters: {},
			},
		],
		connections: { Start: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
		...overrides,
	};
}

function makeContext(overrides: Partial<InstanceAiContext> = {}) {
	return {
		logger: { debug: vi.fn(), warn: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

function setup(context = makeContext()) {
	const published: InstanceAiEvent[] = [];
	const publisher = createWorkflowDraftPublisher({
		eventBus: { publish: (_threadId, event) => published.push(event) },
		threadId: 'thread-1',
		runId: 'run-1',
		agentId: 'agent-1',
		context,
	});
	const drafts = () =>
		published.flatMap((event) => (event.type === 'workflow-draft' ? [event] : []));
	return { publisher, published, drafts, context };
}

describe('createWorkflowDraftPublisher', () => {
	it('publishes a compiled workflow as a valid draft event', async () => {
		const { publisher, published, drafts } = setup();

		await publisher.publish({ filePath: FILE, workflow: compiledWorkflow() });

		expect(drafts()).toHaveLength(1);
		expect(instanceAiEventSchema.safeParse(published[0]).success).toBe(true);
		expect(drafts()[0]).toMatchObject({
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { filePath: FILE, revision: 1, workflow: { name: 'Demo' } },
		});
		expect(drafts()[0].payload.workflow.nodes.map((node) => node.name)).toEqual(['Start', 'Set']);
	});

	it('keeps the node groups of the compiled workflow', async () => {
		const { publisher, drafts } = setup();

		await publisher.publish({
			filePath: FILE,
			workflow: compiledWorkflow({
				nodeGroups: [{ id: 'g-1', name: 'Prepare', nodeIds: ['start', 'set'] }],
			}),
		});

		expect(drafts()[0].payload.workflow.nodeGroups).toEqual([
			expect.objectContaining({ name: 'Prepare', nodeIds: ['start', 'set'] }),
		]);
	});

	it('drops the groups that the save would drop', async () => {
		const { publisher, drafts } = setup();

		await publisher.publish({
			filePath: FILE,
			workflow: compiledWorkflow({
				nodeGroups: [{ id: 'g-1', name: 'Ghost', nodeIds: ['missing-node'] }],
			}),
		});

		expect(drafts()[0].payload.workflow.nodeGroups ?? []).toHaveLength(0);
	});

	it('moves the nodes of a bound workflow to their saved positions', async () => {
		const saved = compiledWorkflow();
		saved.nodes[0].position = [400, 300];
		const { publisher, drafts } = setup(
			makeContext({
				workflowService: { getAsWorkflowJSON: vi.fn().mockResolvedValue(saved) },
			} as unknown as Partial<InstanceAiContext>),
		);

		await publisher.publish({ filePath: FILE, workflowId: 'wf-1', workflow: compiledWorkflow() });

		expect(drafts()[0].payload).toMatchObject({ workflowId: 'wf-1' });
		expect(drafts()[0].payload.workflow.nodes[0].position).toEqual([400, 300]);
	});

	it('does not change the compiled workflow it was given', async () => {
		const { publisher } = setup();
		const workflow = compiledWorkflow({
			nodeGroups: [{ id: 'g-1', name: 'Ghost', nodeIds: ['missing-node'] }],
		});

		await publisher.publish({ filePath: FILE, workflow });

		expect(workflow.nodeGroups).toHaveLength(1);
	});

	it('numbers the drafts of each file separately', async () => {
		const { publisher, drafts } = setup();

		await publisher.publish({ filePath: FILE, workflow: compiledWorkflow() });
		await publisher.publish({
			filePath: 'src/workflows/other.workflow.ts',
			workflow: compiledWorkflow(),
		});
		await publisher.publish({ filePath: FILE, workflow: compiledWorkflow() });

		expect(drafts().map((draft) => [draft.payload.filePath, draft.payload.revision])).toEqual([
			[FILE, 1],
			['src/workflows/other.workflow.ts', 1],
			[FILE, 2],
		]);
	});

	it('publishes nothing and does not throw when preparing the draft fails', async () => {
		const { publisher, published } = setup(
			makeContext({
				workflowService: { getAsWorkflowJSON: vi.fn().mockRejectedValue(new Error('db down')) },
			} as unknown as Partial<InstanceAiContext>),
		);

		await expect(
			publisher.publish({ filePath: FILE, workflowId: 'wf-1', workflow: compiledWorkflow() }),
		).resolves.toBeUndefined();
		expect(published).toHaveLength(0);
	});

	it('publishes nothing for a workflow the draft schema rejects', async () => {
		const { publisher, published } = setup();

		await publisher.publish({
			filePath: FILE,
			workflow: compiledWorkflow({ name: undefined as unknown as string }),
		});

		expect(published).toHaveLength(0);
	});
});
