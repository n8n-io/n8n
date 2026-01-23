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

	describe('updateExistingExecution with requireStatus', () => {
		test.each([
			{
				statusInDB: 'waiting',
				statusUpdate: 'running',
				requireStatus: 'waiting',
				updateExpected: true,
			},
			{
				statusInDB: 'success',
				statusUpdate: 'running',
				requireStatus: 'waiting',
				updateExpected: false,
			},
			{
				statusInDB: 'running',
				statusUpdate: 'success',
				updateExpected: true,
			},
		] satisfies Array<{
			statusInDB: ExecutionStatus;
			statusUpdate: ExecutionStatus;
			requireStatus?: ExecutionStatus;
			updateExpected: boolean;
		}>)(
			'should return $updateExpected with status before: "$statusInDB", status after: "$statusUpdate" and required status: "$requireStatus"',
			async ({ statusInDB, statusUpdate, requireStatus, updateExpected }) => {
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
					// Require current status to be 'waiting'
					requireStatus,
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

			// Verify execution was updated regardless of previous status
			const rowCount = await executionRepository.count();
			expect(rowCount).toBe(0);
		});
	});
});
