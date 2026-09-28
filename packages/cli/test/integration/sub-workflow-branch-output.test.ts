import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

describe('sub-workflow branch output (ADO-5857)', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let executionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;
	const position: [number, number] = [0, 0];

	beforeAll(async () => {
		await testDb.init();
		owner = await createOwner();
		await utils.initNodeTypes(
			loadNodesFromDist([
				'n8n-nodes-base.manualTrigger',
				'n8n-nodes-base.executeWorkflow',
				'n8n-nodes-base.executeWorkflowTrigger',
				'n8n-nodes-base.if',
				'n8n-nodes-base.noOp',
			]),
		);
		await utils.initBinaryDataService();
		executionService = Container.get(WorkflowExecutionService);
		executionRepository = Container.get(ExecutionRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it.each([
		{ branch: 'first', rightValue: 1, outputIndex: 0 },
		{ branch: 'second', rightValue: 2, outputIndex: 1 },
	])(
		"passes items from the child If node's $branch output to the parent",
		async ({ rightValue, outputIndex }) => {
			const child = await createWorkflow(
				{
					name: 'Child',
					nodes: [
						{
							id: uuid(),
							name: 'Child trigger',
							type: 'n8n-nodes-base.executeWorkflowTrigger',
							typeVersion: 1.2,
							position,
							parameters: { inputSource: 'passthrough' },
						},
						{
							id: uuid(),
							name: 'If',
							type: 'n8n-nodes-base.if',
							typeVersion: 2.3,
							position,
							parameters: {
								conditions: {
									options: {
										caseSensitive: true,
										leftValue: '',
										typeValidation: 'strict',
										version: 3,
									},
									conditions: [
										{
											id: uuid(),
											leftValue: 1,
											rightValue,
											operator: { type: 'number', operation: 'equals' },
										},
									],
									combinator: 'and',
								},
								options: {},
							},
						},
					],
					connections: {
						'Child trigger': {
							main: [[{ node: 'If', type: NodeConnectionTypes.Main, index: 0 }]],
						},
					},
				},
				owner,
			);
			const parent = await createWorkflow(
				{
					name: 'Parent',
					nodes: [
						{
							id: uuid(),
							name: 'Parent trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position,
							parameters: {},
						},
						{
							id: uuid(),
							name: 'Execute Sub-workflow',
							type: 'n8n-nodes-base.executeWorkflow',
							typeVersion: 1.3,
							position,
							parameters: {
								workflowId: { __rl: true, value: child.id, mode: 'list' },
								options: { waitForSubWorkflow: true },
							},
						},
						{
							id: uuid(),
							name: 'After child',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position,
							parameters: {},
						},
					],
					connections: {
						'Parent trigger': {
							main: [[{ node: 'Execute Sub-workflow', type: NodeConnectionTypes.Main, index: 0 }]],
						},
						'Execute Sub-workflow': {
							main: [[{ node: 'After child', type: NodeConnectionTypes.Main, index: 0 }]],
						},
					},
				},
				owner,
			);

			const result = await executionService.executeManually(
				parent,
				{ triggerToStartFrom: { name: 'Parent trigger' } },
				owner,
			);
			if (!('executionId' in result)) throw new Error('Expected a stored parent execution');

			const start = Date.now();
			let parentExecution;
			while (Date.now() - start < 10_000) {
				parentExecution = await executionRepository.findOneBy({ id: result.executionId });
				if (parentExecution?.finished) break;
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			expect(parentExecution?.status).toBe('success');

			const childExecution = await executionRepository.findOneByOrFail({ workflowId: child.id });
			const childData = await executionRepository.findSingleExecution(childExecution.id, {
				includeData: true,
				unflattenData: true,
			});
			expect(childData?.data.resultData.runData.If?.at(-1)?.data?.main?.[outputIndex]).toEqual([
				expect.objectContaining({ json: {} }),
			]);

			const parentData = await executionRepository.findSingleExecution(result.executionId, {
				includeData: true,
				unflattenData: true,
			});
			expect(parentData?.data.resultData.runData['After child']?.at(-1)?.data?.main?.[0]).toEqual([
				expect.objectContaining({ json: {} }),
			]);
		},
	);
});
