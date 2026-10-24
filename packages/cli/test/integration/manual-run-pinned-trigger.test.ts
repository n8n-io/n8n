import { testDb, createWorkflow } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

describe('Manual run of a pinned trigger node', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let workflowExecutionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.formTrigger',
			'n8n-nodes-base.webhook',
			'n8n-nodes-base.noOp',
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

	async function waitForExecution(executionId: string, timeout = 10000) {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});
			if (execution?.finished) return execution;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
	}

	test.each([
		{ type: 'n8n-nodes-base.formTrigger', typeVersion: 2.2 },
		{ type: 'n8n-nodes-base.webhook', typeVersion: 2 },
	])(
		'runs $type with its pinned data instead of waiting for a test call',
		async ({ type, typeVersion }) => {
			const pinnedItem = { json: { pinned: true } };
			const workflow = await createWorkflow(
				{
					name: 'Pinned trigger',
					nodes: [
						{
							id: uuid(),
							name: 'Trigger',
							type,
							typeVersion,
							position: [0, 0],
							parameters: { path: uuid() },
							webhookId: uuid(),
						},
						{
							id: uuid(),
							name: 'NoOp',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'NoOp', type: NodeConnectionTypes.Main, index: 0 }]] },
					},
					pinData: { Trigger: [pinnedItem] },
				} as unknown as IWorkflowDb,
				owner,
			);

			const result = await workflowExecutionService.executeManually(
				workflow,
				{ destinationNode: { nodeName: 'Trigger', mode: 'inclusive' } },
				owner,
			);

			expect(result).toEqual({ executionId: expect.any(String) });
			if (!('executionId' in result)) return;

			const execution = await waitForExecution(result.executionId);
			const { runData } = execution.data.resultData;
			expect(execution.status).toBe('success');
			expect(Object.keys(runData)).toEqual(['Trigger']);
			expect(runData.Trigger[0].data?.main[0]).toEqual([expect.objectContaining(pinnedItem)]);
		},
	);
});
