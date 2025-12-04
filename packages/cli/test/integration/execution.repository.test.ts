import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify, parse } from 'flatted';
import { DateTime } from 'luxon';
import { createEmptyRunExecutionData, createRunExecutionData } from 'n8n-workflow';

import { createExecution } from '@test-integration/db/executions';

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
		test('should return true and update when status matches requirement', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({ status: 'waiting' }, workflow);

			const result = await executionRepository.updateExistingExecution(
				execution.id,
				{ id: execution.id, status: 'running' },
				// Require current status to be 'waiting'
				'waiting',
			);

			expect(result).toBe(true);

			// Verify execution was actually updated
			const updated = await executionRepository.findOneBy({ id: execution.id });
			expect(updated?.status).toBe('running');
		});

		test('should return false and not update when status does not match requirement', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution(
				// Currently running
				{ status: 'running', data: stringify(createEmptyRunExecutionData()) },
				workflow,
			);

			const result = await executionRepository.updateExistingExecution(
				execution.id,
				{
					id: execution.id,
					status: 'success',
					// data should not be set, because updating the status already fails
					data: createRunExecutionData({ resultData: { lastNodeExecuted: 'foobar' } }),
				},
				// Require status to be 'waiting', but it's 'running'
				'waiting',
			);

			expect(result).toBe(false);

			// Verify execution was NOT updated
			const notUpdated = await executionRepository.findOne({
				where: { id: execution.id },
				relations: { executionData: true },
			});
			expect(notUpdated!.status).toBe('running'); // Still 'running', not 'success'
			expect(parse(notUpdated!.executionData.data)).toEqual(createEmptyRunExecutionData()); // Still 'running', not 'success'
		});

		test('should always return true when no status requirement (backward compatibility)', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({ status: 'running' }, workflow);

			const result = await executionRepository.updateExistingExecution(
				execution.id,
				{
					id: execution.id,
					status: 'success',
				},
				// No requireStatus parameter - should always update
			);

			expect(result).toBe(true);

			// Verify execution was updated regardless of previous status
			const updated = await executionRepository.findOneBy({ id: execution.id });
			expect(updated?.status).toBe('success');
		});
	});
});
