import config from '@/config';
import * as Db from '@/Db';

import * as testDb from '../shared/testDb';
import type { ExecutionStatus, ILogger } from 'n8n-workflow';
import { LoggerProxy, sleep } from 'n8n-workflow';
import type { ExecutionRepository } from '../../../src/databases/repositories';
import type { ExecutionEntity } from '../../../src/databases/entities/ExecutionEntity';
import { TIME } from '../../../src/constants';
import { mock } from 'jest-mock-extended';

async function findAllExecutions() {
	return Db.collections.Execution.find({
		order: { id: 'asc' },
		withDeleted: true,
	});
}

async function createPrunableExecutions(numberOfExecutions: number) {
	await Promise.all(
		Array.from({ length: numberOfExecutions }).map(async () => {
			return testDb.createExecution(
				{ finished: true, status: 'success', deletedAt: yesterday },
				workflow,
			);
		}),
	);
}

const mockLogger = mock<ILogger>();

const now = new Date();
const yesterday = new Date(Date.now() - TIME.DAY);
let executionRepository: ExecutionRepository;
let workflow: Awaited<ReturnType<typeof testDb.createWorkflow>>;

beforeAll(async () => {
	LoggerProxy.init(mockLogger);
	await testDb.init();

	executionRepository = Db.collections.Execution;
	workflow = await testDb.createWorkflow();
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate(['Execution']);
});

afterEach(() => {
	jest.restoreAllMocks();
	config.load(config.default);
});

describe('softDeleteOnPruningCycle()', () => {
	describe('when EXECUTIONS_DATA_PRUNE_MAX_COUNT is set', () => {
		beforeEach(() => {
			config.set('executions.pruneDataMaxCount', 1);
			config.set('executions.pruneDataMaxAge', 336);
		});

		test('should mark as deleted based on EXECUTIONS_DATA_PRUNE_MAX_COUNT', async () => {
			const executions = [
				await testDb.createSuccessfulExecution(workflow),
				await testDb.createSuccessfulExecution(workflow),
				await testDb.createSuccessfulExecution(workflow),
			];

			await executionRepository.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});

		test('should not re-mark already marked executions', async () => {
			const executions = [
				await testDb.createExecution(
					{ status: 'success', finished: true, startedAt: now, stoppedAt: now, deletedAt: now },
					workflow,
				),
				await testDb.createSuccessfulExecution(workflow),
			];

			await executionRepository.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: now }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['warning', { startedAt: now, stoppedAt: now }],
			['unknown', { startedAt: now, stoppedAt: now }],
			['canceled', { startedAt: now, stoppedAt: now }],
			['crashed', { startedAt: now, stoppedAt: now }],
			['failed', { startedAt: now, stoppedAt: now }],
			['success', { finished: true, startedAt: now, stoppedAt: now }],
		])('should prune %s executions', async (status, attributes) => {
			const executions = [
				await testDb.createExecution({ status, ...attributes }, workflow),
				await testDb.createSuccessfulExecution(workflow),
			];

			await executionRepository.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['new', {}],
			['running', { startedAt: now }],
			['waiting', { startedAt: now, stoppedAt: now, waitTill: now }],
		])('should not prune %s executions', async (status, attributes) => {
			const executions = [
				await testDb.createExecution({ status, ...attributes }, workflow),
				await testDb.createSuccessfulExecution(workflow),
			];

			await executionRepository.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});
	});

	describe('when EXECUTIONS_DATA_MAX_AGE is set', () => {
		beforeEach(() => {
			config.set('executions.pruneDataMaxAge', 1); // 1h
			config.set('executions.pruneDataMaxCount', 0);
		});

		test('should mark as deleted based on EXECUTIONS_DATA_MAX_AGE', async () => {
			const executions = [
				await testDb.createExecution(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await testDb.createExecution(
					{ finished: true, startedAt: now, stoppedAt: now, status: 'success' },
					workflow,
				),
			];

			await executionRepository.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test('should not re-mark already marked executions', async () => {
			const executions = [
				await testDb.createExecution(
					{
						status: 'success',
						finished: true,
						startedAt: yesterday,
						stoppedAt: yesterday,
						deletedAt: yesterday,
					},
					workflow,
				),
				await testDb.createSuccessfulExecution(workflow),
			];

			await executionRepository.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: yesterday }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['warning', { startedAt: yesterday, stoppedAt: yesterday }],
			['unknown', { startedAt: yesterday, stoppedAt: yesterday }],
			['canceled', { startedAt: yesterday, stoppedAt: yesterday }],
			['crashed', { startedAt: yesterday, stoppedAt: yesterday }],
			['failed', { startedAt: yesterday, stoppedAt: yesterday }],
			['success', { finished: true, startedAt: yesterday, stoppedAt: yesterday }],
		])('should prune %s executions', async (status, attributes) => {
			const execution = await testDb.createExecution({ status, ...attributes }, workflow);

			await executionRepository.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: execution.id, deletedAt: expect.any(Date) }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['new', {}],
			['running', { startedAt: yesterday }],
			['waiting', { startedAt: yesterday, stoppedAt: yesterday, waitTill: yesterday }],
		])('should not prune %s executions', async (status, attributes) => {
			const executions = [
				await testDb.createExecution({ status, ...attributes }, workflow),
				await testDb.createSuccessfulExecution(workflow),
			];

			await executionRepository.softDeleteOnPruningCycle();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});
	});
});

describe('hardDeleteOnPruningCycle()', () => {
	describe('when executions to hard delete exceed batch size', () => {
		test('should speed up and slow down executions removal', async () => {
			executionRepository.setHardDeletionInterval();

			jest.replaceProperty(executionRepository, 'deletionBatchSize', 5);
			const numberOfExecutions = executionRepository.deletionBatchSize + 1;
			await createPrunableExecutions(numberOfExecutions);
			const deleteSpy = jest.spyOn(executionRepository, 'delete');

			await executionRepository.hardDeleteOnPruningCycle();

			await sleep(2 * TIME.SECOND);

			expect(deleteSpy).toHaveBeenCalledTimes(2);
			expect(await findAllExecutions()).toHaveLength(0);

			clearInterval(executionRepository.intervals.hardDeletion); // prevent open handles
		});
	});
});
