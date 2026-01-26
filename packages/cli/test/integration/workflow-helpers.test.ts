import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { parse, stringify } from 'flatted';
import { mock } from 'jest-mock-extended';
import type { IRun, INode, ITaskData } from 'n8n-workflow';
import { createRunExecutionData, WAIT_INDEFINITELY } from 'n8n-workflow';

import * as WorkflowHelpers from '@/workflow-helpers';
import { createExecution } from '@test-integration/db/executions';

describe('workflow-helpers', () => {
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();
		executionRepository = Container.get(ExecutionRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('updateParentExecutionWithChildResults', () => {
		test('should update parent nodeExecutionStack with child final output', async () => {
			// ARRANGE
			const workflow = await createWorkflow();

			// Create parent execution with Execute Workflow node in nodeExecutionStack
			const parentData = createRunExecutionData({
				executionData: {
					nodeExecutionStack: [
						{
							node: mock<INode>({ name: 'Execute Workflow' }),
							data: { main: [[{ json: { type: 'parent-input' }, pairedItem: { item: 0 } }]] },
							source: { main: [null] },
						},
					],
				},
			});

			const parent = await createExecution(
				{ status: 'waiting', data: stringify(parentData) },
				workflow,
			);

			// Create child results with final output
			const finalNodeName = 'Final Node';
			const finalNodeNameTaskData: ITaskData = {
				startTime: Date.now(),
				executionTime: 5,
				executionIndex: 0,
				source: [],
				data: { main: [[{ json: { type: 'child-output' }, pairedItem: { item: 0 } }]] },
			};
			const childResults: IRun = {
				mode: 'manual',
				startedAt: new Date(),
				status: 'success',
				data: createRunExecutionData({
					resultData: {
						runData: { [finalNodeName]: [finalNodeNameTaskData] },
						lastNodeExecuted: finalNodeName,
					},
				}),
			};

			// ACT
			await WorkflowHelpers.updateParentExecutionWithChildResults(
				executionRepository,
				parent.id,
				childResults,
			);

			// ASSERT
			const updated = await executionRepository.findOne({
				where: { id: parent.id },
				relations: { executionData: true },
			});

			const updatedData = parse(updated!.executionData.data);
			expect(updatedData.executionData.nodeExecutionStack[0].data.main[0][0].json.type).toBe(
				'child-output',
			);
			expect(updated!.status).toBe('waiting'); // Status unchanged
		});

		test('should not update parent if status is not waiting', async () => {
			// ARRANGE
			const workflow = await createWorkflow();

			const parentData = createRunExecutionData({
				executionData: {
					nodeExecutionStack: [
						{
							node: mock<INode>({ name: 'Execute Workflow' }),
							data: { main: [[{ json: { type: 'parent-input' }, pairedItem: { item: 0 } }]] },
							source: { main: [null] },
						},
					],
				},
			});

			const parent = await createExecution(
				// Not waiting
				{ status: 'running', data: stringify(parentData) },
				workflow,
			);

			const finalNodeName = 'Final Node';
			const finalNodeNameTaskData: ITaskData = {
				startTime: Date.now(),
				executionTime: 5,
				executionIndex: 0,
				source: [],
				data: {
					main: [[{ json: { type: 'child-output' }, pairedItem: { item: 0 } }]],
				},
			};
			const childResults: IRun = {
				mode: 'manual',
				startedAt: new Date(),
				status: 'success',
				data: createRunExecutionData({
					resultData: {
						runData: { [finalNodeName]: [finalNodeNameTaskData] },
						lastNodeExecuted: finalNodeName,
					},
				}),
			};

			// ACT
			await WorkflowHelpers.updateParentExecutionWithChildResults(
				executionRepository,
				parent.id,
				childResults,
			);

			// ASSERT
			const notUpdated = await executionRepository.findOne({
				where: { id: parent.id },
				relations: { executionData: true },
			});

			const notUpdatedData = parse(notUpdated!.executionData.data);
			expect(notUpdatedData.executionData.nodeExecutionStack[0].data.main[0][0].json.type).toBe(
				'parent-input',
			);
		});

		test('should handle child results with no lastNodeExecuted', async () => {
			// ARRANGE
			const workflow = await createWorkflow();

			const parentData = createRunExecutionData({
				executionData: {
					nodeExecutionStack: [
						{
							node: mock<INode>({ name: 'Execute Workflow' }),
							data: { main: [[{ json: { type: 'parent-input' }, pairedItem: { item: 0 } }]] },
							source: { main: [null] },
						},
					],
				},
			});

			const parent = await createExecution(
				{
					status: 'waiting',
					data: stringify(parentData),
				},
				workflow,
			);

			// Child results with no lastNodeExecuted
			const childResults: IRun = {
				mode: 'manual',
				startedAt: new Date(),
				status: 'success',
				data: createRunExecutionData({ resultData: { runData: {} } }),
			};

			// ACT
			await WorkflowHelpers.updateParentExecutionWithChildResults(
				executionRepository,
				parent.id,
				childResults,
			);

			// ASSERT
			const notUpdated = await executionRepository.findOne({
				where: { id: parent.id },
				relations: { executionData: true },
			});

			const notUpdatedData = parse(notUpdated!.executionData.data);
			expect(notUpdatedData.executionData.nodeExecutionStack[0].data.main[0][0].json.type).toBe(
				'parent-input',
			);
		});

		test('should handle parent with empty nodeExecutionStack', async () => {
			// ARRANGE
			const workflow = await createWorkflow();

			const parentData = createRunExecutionData({
				executionData: {
					nodeExecutionStack: [], // Empty
				},
			});

			const parent = await createExecution(
				{
					status: 'waiting',
					waitTill: WAIT_INDEFINITELY,
					data: stringify(parentData),
				},
				workflow,
			);

			const finalNodeName = 'Final Node';
			const finalNodeNameTaskData: ITaskData = {
				startTime: Date.now(),
				executionTime: 5,
				executionIndex: 0,
				source: [],
				data: {
					main: [[{ json: { type: 'child-output' }, pairedItem: { item: 0 } }]],
				},
			};
			const childResults: IRun = {
				mode: 'manual',
				startedAt: new Date(),
				status: 'success',
				data: createRunExecutionData({
					resultData: {
						runData: { [finalNodeName]: [finalNodeNameTaskData] },
						lastNodeExecuted: finalNodeName,
					},
				}),
			};

			// ACT & ASSERT
			await expect(
				WorkflowHelpers.updateParentExecutionWithChildResults(
					executionRepository,
					parent.id,
					childResults,
				),
			).resolves.not.toThrow();
		});
	});
});
