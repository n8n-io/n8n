import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createExecution } from '@test-integration/db/executions';
import { stringify, parse } from 'flatted';
import { DateTime } from 'luxon';
import type { ExecutionStatus } from 'n8n-workflow';
import { createEmptyRunExecutionData, createRunExecutionData } from 'n8n-workflow';

describe('UserRepository', () => {
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

	describe('findManyByRangeQuery', () => {
		test('sort by `createdAt` if `startedAt` is null', async () => {
			const now = DateTime.utc();
			const workflow = await createWorkflow();
			const execution1 = await createExecution(
				{
					createdAt: now.plus({ minute: 1 }).toJSDate(),
					startedAt: now.plus({ minute: 1 }).toJSDate(),
				},
				workflow,
			);
			const execution2 = await createExecution(
				{
					createdAt: now.plus({ minute: 2 }).toJSDate(),
					startedAt: null,
				},
				workflow,
			);
			const execution3 = await createExecution(
				{
					createdAt: now.plus({ minute: 3 }).toJSDate(),
					startedAt: now.plus({ minute: 3 }).toJSDate(),
				},
				workflow,
			);

			const executions = await executionRepository.findManyByRangeQuery({
				workflowId: workflow.id,
				accessibleWorkflowIds: [workflow.id],
				kind: 'range',
				range: { limit: 10 },
				order: { startedAt: 'DESC' },
			});

			// Executions are returned in reverse order, and if `startedAt` is not
			// defined `createdAt` is used.
			expect(executions.map((e) => e.id)).toStrictEqual([
				execution3.id,
				execution2.id,
				execution1.id,
			]);
		});
	});

	describe('updateExistingExecution with conditions', () => {
		test.each([
			{
				statusInDB: 'waiting' as ExecutionStatus,
				statusUpdate: 'running' as ExecutionStatus,
				conditions: { requireStatus: 'waiting' as ExecutionStatus },
				updateExpected: true,
			},
			{
				statusInDB: 'success' as ExecutionStatus,
				statusUpdate: 'running' as ExecutionStatus,
				conditions: { requireStatus: 'waiting' as ExecutionStatus },
				updateExpected: false,
			},
			{
				statusInDB: 'running' as ExecutionStatus,
				statusUpdate: 'success' as ExecutionStatus,
				conditions: undefined,
				updateExpected: true,
			},
		])(
			'should return $updateExpected with status before: "$statusInDB", status after: "$statusUpdate" and conditions: $conditions',
			async ({ statusInDB, statusUpdate, conditions, updateExpected }) => {
				// ARRANGE

				const workflow = await createWorkflow();
				const executionData = createEmptyRunExecutionData();
				const execution = await createExecution(
					{ status: statusInDB, data: stringify(executionData) },
					workflow,
				);

				const updatedExecutionData = createRunExecutionData({
					resultData: { lastNodeExecuted: 'foobar' },
				});

				// ACT
				const result = await executionRepository.updateExistingExecution(
					execution.id,
					{ status: statusUpdate, data: updatedExecutionData },
					conditions,
				);

				// ASSERT
				expect(result).toBe(updateExpected);

				const row = await executionRepository.findOne({
					where: { id: execution.id },
					relations: { executionData: true },
				});
				expect(row?.status).toBe(updateExpected ? statusUpdate : statusInDB);
				expect(parse(row!.executionData.data)).toEqual(
					updateExpected ? updatedExecutionData : executionData,
				);
			},
		);

		test('returns false if no execution was found', async () => {
			const result = await executionRepository.updateExistingExecution('1', { status: 'success' });

			expect(result).toBe(false);

			const rowCount = await executionRepository.count();
			expect(rowCount).toBe(0);
		});

		test('requireNotFinished: should update when finished is false', async () => {
			const workflow = await createWorkflow();
			const executionData = createEmptyRunExecutionData();
			const execution = await createExecution(
				{ status: 'running', finished: false, data: stringify(executionData) },
				workflow,
			);

			const result = await executionRepository.updateExistingExecution(
				execution.id,
				{ status: 'running' },
				{ requireNotFinished: true },
			);

			expect(result).toBe(true);
		});

		test('requireNotFinished: should not update when finished is true', async () => {
			const workflow = await createWorkflow();
			const executionData = createEmptyRunExecutionData();
			const execution = await createExecution(
				{ status: 'success', finished: true, data: stringify(executionData) },
				workflow,
			);

			const result = await executionRepository.updateExistingExecution(
				execution.id,
				{ status: 'running' },
				{ requireNotFinished: true },
			);

			expect(result).toBe(false);
			const row = await executionRepository.findOne({ where: { id: execution.id } });
			expect(row?.status).toBe('success');
		});

		test('requireNotCanceled: should update when status is not canceled', async () => {
			const workflow = await createWorkflow();
			const executionData = createEmptyRunExecutionData();
			const execution = await createExecution(
				{ status: 'running', data: stringify(executionData) },
				workflow,
			);

			const result = await executionRepository.updateExistingExecution(
				execution.id,
				{ status: 'running' },
				{ requireNotCanceled: true },
			);

			expect(result).toBe(true);
		});

		test('requireNotCanceled: should not update when status is canceled', async () => {
			const workflow = await createWorkflow();
			const executionData = createEmptyRunExecutionData();
			const execution = await createExecution(
				{ status: 'canceled', data: stringify(executionData) },
				workflow,
			);

			const result = await executionRepository.updateExistingExecution(
				execution.id,
				{ status: 'running' },
				{ requireNotCanceled: true },
			);

			expect(result).toBe(false);
			const row = await executionRepository.findOne({ where: { id: execution.id } });
			expect(row?.status).toBe('canceled');
		});

		test('requireNotFinished + requireNotCanceled: should update running unfinished execution', async () => {
			const workflow = await createWorkflow();
			const executionData = createEmptyRunExecutionData();
			const execution = await createExecution(
				{ status: 'running', finished: false, data: stringify(executionData) },
				workflow,
			);

			const updatedData = createRunExecutionData({
				resultData: { lastNodeExecuted: 'Node1' },
			});

			const result = await executionRepository.updateExistingExecution(
				execution.id,
				{ status: 'running', data: updatedData },
				{ requireNotFinished: true, requireNotCanceled: true },
			);

			expect(result).toBe(true);

			const row = await executionRepository.findOne({
				where: { id: execution.id },
				relations: { executionData: true },
			});
			expect(parse(row!.executionData.data)).toEqual(updatedData);
		});

		test('requireNotFinished + requireNotCanceled: should not update canceled execution', async () => {
			const workflow = await createWorkflow();
			const executionData = createEmptyRunExecutionData();
			const execution = await createExecution(
				{ status: 'canceled', finished: false, data: stringify(executionData) },
				workflow,
			);

			const result = await executionRepository.updateExistingExecution(
				execution.id,
				{ status: 'running' },
				{ requireNotFinished: true, requireNotCanceled: true },
			);

			expect(result).toBe(false);
			const row = await executionRepository.findOne({ where: { id: execution.id } });
			expect(row?.status).toBe('canceled');
		});
	});
});
