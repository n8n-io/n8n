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
 * A parent workflow calls a sub-workflow. A node after the Execute Sub-workflow
 * node must still resolve `$('Source').item` to the items that the result comes from.
 */
describe('paired items across a sub-workflow', () => {
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
			'n8n-nodes-base.aggregate',
			'n8n-nodes-base.splitOut',
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

	/** Sub: Execute Workflow Trigger -> Aggregate (all items into one item). */
	function subWorkflowEndingWithAggregate(saveDataSuccessExecution: 'all' | 'none') {
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
					parameters: { aggregate: 'aggregateAllItemData', options: {} },
					type: 'n8n-nodes-base.aggregate',
					typeVersion: 1,
					id: uuid(),
					name: 'Aggregate',
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'Aggregate', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			settings: { executionOrder: 'v1', saveDataSuccessExecution },
		};
	}

	const setField = (name: string, value: string, type = 'string') => ({
		assignments: { assignments: [{ id: uuid(), name, type, value }] },
		options: {},
	});

	const connectionTo = (node: string) => ({
		main: [[{ node, type: NodeConnectionTypes.Main, index: 0 }]],
	});

	/** The nodes of the parent workflow from the trigger to the Source node. */
	type SourceNodes = { firstNode: string; nodes: object[]; connections: object };

	/** A Source node that gives one item. */
	const sourceOfOneItem = (): SourceNodes => ({
		firstNode: 'Source',
		nodes: [
			{
				parameters: setField('value', SOURCE_VALUE),
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				id: uuid(),
				name: 'Source',
			},
		],
		connections: {},
	});

	/** Values -> Source. The Source node gives the items A and B. */
	const sourceOfTwoItems = (): SourceNodes => ({
		firstNode: 'Values',
		nodes: [
			{
				parameters: setField('value', "={{ ['A', 'B'] }}", 'array'),
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				id: uuid(),
				name: 'Values',
			},
			{
				parameters: { fieldToSplitOut: 'value', options: {} },
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				id: uuid(),
				name: 'Source',
			},
		],
		connections: { Values: connectionTo('Source') },
	});

	/** Parent: Manual Trigger -> Source -> Execute Sub-workflow -> Consumer. */
	function parentCallingSub(childWorkflowId: string, source: SourceNodes = sourceOfOneItem()) {
		return {
			nodes: [
				{
					parameters: {},
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					id: uuid(),
					name: 'Trigger',
				},
				...source.nodes,
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
				Trigger: connectionTo(source.firstNode),
				...source.connections,
				Source: connectionTo('Execute Sub-workflow'),
				'Execute Sub-workflow': connectionTo('Consumer'),
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

	async function runParent(parent: IWorkflowDb) {
		const result = await workflowExecutionService.executeManually({
			workflowData: parent,
			payload: { triggerToStartFrom: { name: 'Trigger' } },
			user: owner,
		});
		if (!('executionId' in result)) {
			throw new Error(`Expected an executionId, got ${JSON.stringify(result)}`);
		}
		const { status } = await waitForFinish(result.executionId);
		const parentData = await executionRepository.findSingleExecution(result.executionId, {
			includeData: true,
			unflattenData: true,
		});
		return { status, resultData: parentData?.data.resultData };
	}

	it.each(['all', 'none'] as const)(
		'should resolve the item of a node before a sub-workflow that ends with a Merge node, when the sub-workflow saves "%s" successful executions',
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

			const { status, resultData } = await runParent(parent);
			expect(status).toBe('success');

			const savedChildExecutions = await executionRepository.count({
				where: { workflowId: child.id },
			});
			expect(savedChildExecutions).toBe(saveDataSuccessExecution === 'all' ? 1 : 0);

			const runData = resultData?.runData;
			expect(runData?.['Execute Sub-workflow']?.at(-1)?.data?.main?.[0]?.[0].pairedItem).toEqual({
				item: 0,
			});
			expect(runData?.Consumer?.at(-1)?.data?.main?.[0]?.[0].json).toEqual({ value: SOURCE_VALUE });
		},
	);

	it.each(['all', 'none'] as const)(
		'should keep the two items that a sub-workflow aggregates into one item, when the sub-workflow saves "%s" successful executions',
		async (saveDataSuccessExecution) => {
			const child = await createWorkflow(
				{
					name: 'Child',
					...subWorkflowEndingWithAggregate(saveDataSuccessExecution),
				} as unknown as IWorkflowDb,
				owner,
			);
			const parent = await createWorkflow(
				{
					name: 'Parent',
					...parentCallingSub(child.id, sourceOfTwoItems()),
				} as unknown as IWorkflowDb,
				owner,
			);

			const { status, resultData } = await runParent(parent);
			const runData = resultData?.runData;
			expect(runData?.['Execute Sub-workflow']?.at(-1)?.data?.main?.[0]?.[0].pairedItem).toEqual([
				{ item: 0 },
				{ item: 1 },
			]);
			// The result comes from A and B, so the expression must not select A.
			expect(status).toBe('error');
			expect(resultData?.error).toMatchObject({
				node: { name: 'Consumer' },
				context: { type: 'paired_item_multiple_matches' },
			});
		},
	);
});
