import { testDb, createWorkflow } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

const SUB_ERROR_MESSAGE = 'Error from sub-workflow after webhook resume';

/**
 * A parent workflow calls a sub-workflow with "Wait For Sub-Workflow Completion".
 * The sub waits on a webhook and then errors (Stop and Error). When the sub resumes
 * and errors, the parent's Execute Sub-workflow node must fail; it must not be
 * marked successful and pass its input straight through as output.
 */
describe('sub-workflow error propagation to parent after Wait resume', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let workflowExecutionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
			'n8n-nodes-base.wait',
			'n8n-nodes-base.stopAndError',
		]);

		await utils.initNodeTypes(nodeTypes);
		await utils.initBinaryDataService();

		workflowExecutionService = Container.get(WorkflowExecutionService);
		executionRepository = Container.get(ExecutionRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** Sub: Execute Workflow Trigger -> Wait (resume on webhook) -> Stop and Error. */
	function subWorkflowWithWaitThenError() {
		return {
			nodes: [
				{
					parameters: { inputSource: 'passthrough' },
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					typeVersion: 1.1,
					id: uuid(),
					name: 'Trigger',
				},
				{
					parameters: { resume: 'webhook', options: {} },
					type: 'n8n-nodes-base.wait',
					typeVersion: 1.1,
					id: uuid(),
					name: 'Wait',
					webhookId: uuid(),
				},
				{
					parameters: { errorMessage: SUB_ERROR_MESSAGE },
					type: 'n8n-nodes-base.stopAndError',
					typeVersion: 1,
					id: uuid(),
					name: 'Stop and Error',
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Wait', type: NodeConnectionTypes.Main, index: 0 }]] },
				Wait: { main: [[{ node: 'Stop and Error', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
		};
	}

	/** Parent: Manual Trigger -> Execute Sub-workflow (waitForSubWorkflow). */
	function parentCallingSub(childWorkflowId: string) {
		return {
			nodes: [
				{
					parameters: {},
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					id: uuid(),
					name: 'Trigger',
				},
				{
					parameters: {
						workflowId: { __rl: true, value: childWorkflowId, mode: 'list' },
						options: { waitForSubWorkflow: true },
					},
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.2,
					id: uuid(),
					name: 'Execute Sub-workflow',
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'Execute Sub-workflow', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		};
	}

	async function waitForStatus(
		where: { id: string } | { workflowId: string },
		statuses: string | string[],
		timeout = 10000,
	) {
		const want = Array.isArray(statuses) ? statuses : [statuses];
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOne({ where, order: { createdAt: 'DESC' } });
			if (execution && want.includes(execution.status)) return execution;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error(
			`No execution matching ${JSON.stringify(where)} reached [${want.join(', ')}] within ${timeout}ms`,
		);
	}

	it('should fail the parent Execute Sub-workflow node when the sub errors after resuming', async () => {
		const child = await createWorkflow(
			{ name: 'Child', ...subWorkflowWithWaitThenError() } as unknown as IWorkflowDb,
			owner,
		);
		const parent = await createWorkflow(
			{ name: 'Parent', ...parentCallingSub(child.id) } as unknown as IWorkflowDb,
			owner,
		);

		const result = await workflowExecutionService.executeManually(
			parent,
			{ triggerToStartFrom: { name: 'Trigger' } },
			owner,
		);
		if (!('executionId' in result)) {
			throw new Error(`Expected an executionId, got ${JSON.stringify(result)}`);
		}
		const parentExecutionId = result.executionId;

		// Parent suspends while the sub waits on its webhook.
		await waitForStatus({ id: parentExecutionId }, 'waiting');
		const subExecution = await waitForStatus({ workflowId: child.id }, 'waiting');

		// Resume the waiting sub via the wait-tracker (same parent-resume path as the webhook).
		// Deliberately a dynamic import: hoisting `@/wait-tracker` to a top-level import
		// changes the module evaluation order and trips a circular import — WorkflowRunner
		// is still undefined when DI constructs WorkflowExecutionService, and
		// `executeManually` then fails with "Cannot read properties of undefined (reading 'run')".
		const { WaitTracker } = await import('@/wait-tracker');
		await Container.get(WaitTracker).startExecution(subExecution.id);

		// The sub-workflow errors
		await waitForStatus({ id: subExecution.id }, 'error');
		// Then parent must fail, not resume as a success.
		const parentExecution = await waitForStatus({ id: parentExecutionId }, ['error', 'success']);

		expect(parentExecution.status).toBe('error');

		const parentData = await executionRepository.findSingleExecution(parentExecutionId, {
			includeData: true,
			unflattenData: true,
		});

		const nodeRun = parentData?.data.resultData.runData['Execute Sub-workflow']?.at(-1);
		expect(nodeRun?.executionStatus).toBe('error');
		expect(parentData?.data.resultData.error?.message).toEqual(SUB_ERROR_MESSAGE);
	});
});
