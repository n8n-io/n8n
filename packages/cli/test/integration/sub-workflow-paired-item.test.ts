import { testDb, createWorkflow } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

const SOURCE_VALUE = 'https://example.com/webhook/abc';

/**
 * A parent workflow calls a sub-workflow whose last node is a Merge that gets its
 * item on the second input. A node after the Execute Sub-workflow node must still
 * resolve `$('Source').item`.
 */
describe('paired items across a sub-workflow that ends with a multi-input node', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let workflowExecutionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.set',
			'n8n-nodes-base.merge',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
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

	/** Sub: Execute Workflow Trigger -> Merge (second input only). */
	function subWorkflowEndingWithMerge(saveDataSuccessExecution: 'all' | 'none') {
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
					parameters: {},
					type: 'n8n-nodes-base.merge',
					typeVersion: 3.2,
					id: uuid(),
					name: 'Merge',
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Merge', type: NodeConnectionTypes.Main, index: 1 }]] },
			},
			settings: { executionOrder: 'v1', saveDataSuccessExecution },
		};
	}

	const setField = (name: string, value: string) => ({
		assignments: { assignments: [{ id: uuid(), name, type: 'string', value }] },
		options: {},
	});

	/** Parent: Manual Trigger -> Source -> Execute Sub-workflow -> Consumer. */
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
					parameters: setField('value', SOURCE_VALUE),
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					id: uuid(),
					name: 'Source',
				},
				{
					parameters: {
						workflowId: { __rl: true, value: childWorkflowId, mode: 'id' },
						options: {},
					},
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.2,
					id: uuid(),
					name: 'Execute Sub-workflow',
				},
				{
					parameters: setField('value', "={{ $('Source').item.json.value }}"),
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					id: uuid(),
					name: 'Consumer',
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Source', type: NodeConnectionTypes.Main, index: 0 }]] },
				Source: {
					main: [[{ node: 'Execute Sub-workflow', type: NodeConnectionTypes.Main, index: 0 }]],
				},
				'Execute Sub-workflow': {
					main: [[{ node: 'Consumer', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			settings: { executionOrder: 'v1' },
		};
	}

	async function waitForFinish(executionId: string, timeout = 10000) {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOne({ where: { id: executionId } });
			if (execution && ['success', 'error'].includes(execution.status)) return execution;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error(`Execution ${executionId} did not finish within ${timeout}ms`);
	}

	it.each(['all', 'none'] as const)(
		'should resolve the item of a node before the sub-workflow when the sub-workflow saves "%s" successful executions',
		async (saveDataSuccessExecution) => {
			const child = await createWorkflow(
				{
					name: 'Child',
					...subWorkflowEndingWithMerge(saveDataSuccessExecution),
				} as unknown as IWorkflowDb,
				owner,
			);
			const parent = await createWorkflow(
				{ name: 'Parent', ...parentCallingSub(child.id) } as unknown as IWorkflowDb,
				owner,
			);

			const result = await workflowExecutionService.executeManually({
				workflowData: parent,
				payload: { triggerToStartFrom: { name: 'Trigger' } },
				user: owner,
			});
			if (!('executionId' in result)) {
				throw new Error(`Expected an executionId, got ${JSON.stringify(result)}`);
			}
			const { status } = await waitForFinish(result.executionId);
			expect(status).toBe('success');

			const savedChildExecutions = await executionRepository.count({
				where: { workflowId: child.id },
			});
			expect(savedChildExecutions).toBe(saveDataSuccessExecution === 'all' ? 1 : 0);

			const parentData = await executionRepository.findSingleExecution(result.executionId, {
				includeData: true,
				unflattenData: true,
			});
			const runData = parentData?.data.resultData.runData;
			expect(runData?.['Execute Sub-workflow']?.at(-1)?.data?.main?.[0]?.[0].pairedItem).toEqual({
				item: 0,
			});
			expect(runData?.Consumer?.at(-1)?.data?.main?.[0]?.[0].json).toEqual({ value: SOURCE_VALUE });
		},
	);
});
