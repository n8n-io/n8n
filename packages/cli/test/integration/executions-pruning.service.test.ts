import { mockLogger, createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ExecutionEntity, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';
import type { ExecutionStatus, IWorkflowBase } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionsPruningService } from '@/services/pruning/executions-pruning.service';

import {
	annotateExecution,
	createExecution,
	createSuccessfulExecution,
} from './shared/db/executions';

const OVERLAPPING_RUNS = 4;
const AGED_EXECUTIONS = 20;

describe('softDeleteOnPruningCycle()', () => {
	let pruningService: ExecutionsPruningService;

	const now = new Date();
	const yesterday = new Date(Date.now() - 1 * Time.days.toMilliseconds);
	let workflow: IWorkflowBase;
	let executionsConfig: ExecutionsConfig;

	beforeAll(async () => {
		await testDb.init();

		executionsConfig = Container.get(ExecutionsConfig);
		pruningService = new ExecutionsPruningService(
			mockLogger(),
			mockInstance(ErrorReporter),
			Container.get(ExecutionRepository),
			mockInstance(ExecutionPersistence),
		);

		workflow = await createWorkflow();
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'ExecutionAnnotation']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function findAllExecutions() {
		return await Container.get(ExecutionRepository).find({
			order: { id: 'asc' },
			withDeleted: true,
		});
	}

	describe('when EXECUTIONS_DATA_PRUNE_MAX_COUNT is set', () => {
		beforeAll(() => {
			executionsConfig.pruneDataMaxAge = 336;
			executionsConfig.pruneDataMaxCount = 1;
		});

		test('should mark as deleted based on EXECUTIONS_DATA_PRUNE_MAX_COUNT', async () => {
			const executions = [
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});

		test('prunes with one update statement', async () => {
			await createSuccessfulExecution(workflow);
			await createSuccessfulExecution(workflow);
			const dataSource = Container.get(DataSource);
			const { tableName } = dataSource.getMetadata(ExecutionEntity);
			const querySpy = vi.spyOn(dataSource.logger, 'logQuery');

			try {
				const result = await Container.get(ExecutionRepository).softDeletePrunableExecutions();
				const executionQueries = querySpy.mock.calls
					.map(([query]) => query)
					.filter((query) => query.includes(tableName));

				expect(result.affected).toBe(1);
				expect(executionQueries).toEqual([expect.stringMatching(/^UPDATE /)]);
			} finally {
				querySpy.mockRestore();
			}
		});

		test('keeps executions when the count cutoff is empty', async () => {
			const execution = await createSuccessfulExecution(workflow);

			const result = await Container.get(ExecutionRepository).softDeletePrunableExecutions();

			expect(result.affected).toBe(0);
			expect(await findAllExecutions()).toEqual([
				expect.objectContaining({ id: execution.id, deletedAt: null }),
			]);
		});

		test('excludes newer annotated and deleted executions from the count', async () => {
			const retained = await createSuccessfulExecution(workflow);
			const annotated = await createSuccessfulExecution(workflow);
			await annotateExecution(annotated.id, { vote: 'up' }, [workflow.id]);
			const deleted = await createExecution(
				{ status: 'success', finished: true, startedAt: now, stoppedAt: now, deletedAt: now },
				workflow,
			);

			const result = await Container.get(ExecutionRepository).softDeletePrunableExecutions();

			expect(result.affected).toBe(0);
			expect(await findAllExecutions()).toEqual([
				expect.objectContaining({ id: retained.id, deletedAt: null }),
				expect.objectContaining({ id: annotated.id, deletedAt: null }),
				expect.objectContaining({ id: deleted.id, deletedAt: now }),
			]);
		});

		test('counts active executions without pruning them', async () => {
			const stopped = await createSuccessfulExecution(workflow);
			const running = await createExecution({ status: 'running', startedAt: now }, workflow);

			await pruningService.softDelete();

			expect(await findAllExecutions()).toEqual([
				expect.objectContaining({ id: stopped.id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: running.id, deletedAt: null }),
			]);
		});

		test('marks each execution once when count-based pruning runs overlap', async () => {
			const older: ExecutionEntity[] = [];
			for (let i = 0; i < AGED_EXECUTIONS; i++) {
				older.push(await createSuccessfulExecution(workflow));
			}
			const newest = await createSuccessfulExecution(workflow);
			const repository = Container.get(ExecutionRepository);
			const runOverlapping = async () =>
				await Promise.all(
					Array.from(
						{ length: OVERLAPPING_RUNS },
						async () => await repository.softDeletePrunableExecutions(),
					),
				);

			const firstResults = await runOverlapping();
			const firstPass = await findAllExecutions();
			const repeatedResults = await runOverlapping();

			expect(firstResults.reduce((total, result) => total + (result.affected ?? 0), 0)).toBe(
				older.length,
			);
			expect(firstPass).toEqual([
				...older.map(({ id }) => expect.objectContaining({ id, deletedAt: expect.any(Date) })),
				expect.objectContaining({ id: newest.id, deletedAt: null }),
			]);
			expect(repeatedResults.every((result) => result.affected === 0)).toBe(true);
			expect(await findAllExecutions()).toEqual(firstPass);
		});

		test.skipIf(process.env.DB_TYPE !== 'postgresdb').each<[string, Partial<ExecutionEntity>]>([
			['deleted', { deletedAt: now }],
			['running', { status: 'running' }],
		])('preserves a concurrent %s update', async (_label, update) => {
			const dataSource = Container.get(DataSource);
			const execution = await createSuccessfulExecution(workflow);
			await createSuccessfulExecution(workflow);
			const repository = Container.get(ExecutionRepository);
			const peer = await new DataSource({
				...dataSource.options,
				synchronize: false,
				migrationsRun: false,
			}).initialize();
			const blocker = peer.createQueryRunner();
			let pruning: ReturnType<ExecutionRepository['softDeletePrunableExecutions']> | undefined;

			try {
				await blocker.startTransaction();
				await blocker.manager.update(ExecutionEntity, execution.id, update);
				pruning = repository.softDeletePrunableExecutions();

				// Wait until pruning reaches the row held by the other connection.
				await vi.waitFor(async () => {
					const rows = await blocker.manager.query<Array<{ blocked: boolean }>>(
						`SELECT EXISTS (
								SELECT 1 FROM pg_stat_activity
								WHERE pg_backend_pid() = ANY(pg_blocking_pids(pid))
							) AS blocked`,
					);
					expect(rows).toEqual([{ blocked: true }]);
				});
				await blocker.commitTransaction();

				expect((await pruning).affected).toBe(0);
				expect(
					await repository.findOne({ where: { id: execution.id }, withDeleted: true }),
				).toMatchObject(update);
			} finally {
				if (blocker.isTransactionActive) {
					await blocker.rollbackTransaction();
				}
				await pruning?.catch(() => undefined);
				await blocker.release();
				await peer.destroy();
			}
		});

		test('should not re-mark already marked executions', async () => {
			const executions = [
				await createExecution(
					{ status: 'success', finished: true, startedAt: now, stoppedAt: now, deletedAt: now },
					workflow,
				),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: now }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['unknown', { startedAt: now, stoppedAt: now }],
			['canceled', { startedAt: now, stoppedAt: now }],
			['crashed', { startedAt: now, stoppedAt: now }],
			['error', { startedAt: now, stoppedAt: now }],
			['success', { finished: true, startedAt: now, stoppedAt: now }],
		])('should prune %s executions', async (status, attributes) => {
			const executions = [
				await createExecution({ status, ...attributes }, workflow),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

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
				await createExecution({ status, ...attributes }, workflow),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test('should not prune annotated executions', async () => {
			const executions = [
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
				await createSuccessfulExecution(workflow),
			];

			await annotateExecution(executions[0].id, { vote: 'up' }, [workflow.id]);

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});
	});

	describe('when EXECUTIONS_DATA_MAX_AGE is set', () => {
		beforeAll(() => {
			executionsConfig.pruneDataMaxAge = 1;
			executionsConfig.pruneDataMaxCount = 0;
		});

		test('should mark as deleted based on EXECUTIONS_DATA_MAX_AGE', async () => {
			const executions = [
				await createExecution(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await createExecution(
					{ finished: true, startedAt: now, stoppedAt: now, status: 'success' },
					workflow,
				),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test('should not re-mark already marked executions', async () => {
			const executions = [
				await createExecution(
					{
						status: 'success',
						finished: true,
						startedAt: yesterday,
						stoppedAt: yesterday,
						deletedAt: yesterday,
					},
					workflow,
				),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: yesterday }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test.each<[ExecutionStatus, Partial<ExecutionEntity>]>([
			['unknown', { startedAt: yesterday, stoppedAt: yesterday }],
			['canceled', { startedAt: yesterday, stoppedAt: yesterday }],
			['crashed', { startedAt: yesterday, stoppedAt: yesterday }],
			['error', { startedAt: yesterday, stoppedAt: yesterday }],
			['success', { finished: true, startedAt: yesterday, stoppedAt: yesterday }],
		])('should prune %s executions', async (status, attributes) => {
			const execution = await createExecution({ status, ...attributes }, workflow);

			await pruningService.softDelete();

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
				await createExecution({ status, ...attributes }, workflow),
				await createSuccessfulExecution(workflow),
			];

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});

		test('should not prune annotated executions', async () => {
			const executions = [
				await createExecution(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await createExecution(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await createExecution(
					{ finished: true, startedAt: now, stoppedAt: now, status: 'success' },
					workflow,
				),
			];

			await annotateExecution(executions[0].id, { vote: 'up' }, [workflow.id]);

			await pruningService.softDelete();

			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});

		test('keeps the first deletedAt stamp when overlapping runs repeat', async () => {
			const aged: ExecutionEntity[] = [];
			for (let i = 0; i < AGED_EXECUTIONS; i++) {
				aged.push(
					await createExecution(
						{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
						workflow,
					),
				);
			}
			const recent = await createExecution(
				{ finished: true, startedAt: now, stoppedAt: now, status: 'success' },
				workflow,
			);

			const runOverlapping = async () =>
				await Promise.all(
					Array.from({ length: OVERLAPPING_RUNS }, async () => await pruningService.softDelete()),
				);

			await runOverlapping();
			const firstPass = await findAllExecutions();
			await runOverlapping();

			expect(firstPass).toEqual([
				...aged.map(({ id }) => expect.objectContaining({ id, deletedAt: expect.any(Date) })),
				expect.objectContaining({ id: recent.id, deletedAt: null }),
			]);
			expect(await findAllExecutions()).toEqual(firstPass);
		});
	});

	describe('when the instance clock runs ahead of the database clock', () => {
		const realNow = Date.now();

		beforeAll(() => {
			executionsConfig.pruneDataMaxAge = 1;
			executionsConfig.pruneDataMaxCount = 0;
			executionsConfig.pruneDataHardDeleteBuffer = 1;
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		function moveInstanceClockAhead() {
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(realNow + Time.days.toMilliseconds);
		}

		test('keeps executions younger than the max age on the database clock', async () => {
			const execution = await createSuccessfulExecution(workflow);
			moveInstanceClockAhead();

			await pruningService.softDelete();

			expect(await findAllExecutions()).toEqual([
				expect.objectContaining({ id: execution.id, deletedAt: null }),
			]);
		});

		test('stamps deletedAt with the database clock', async () => {
			await createExecution(
				{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
				workflow,
			);
			moveInstanceClockAhead();

			await pruningService.softDelete();

			const [{ deletedAt }] = await findAllExecutions();
			expect(Math.abs(deletedAt!.getTime() - realNow)).toBeLessThan(Time.hours.toMilliseconds);
		});

		test('keeps soft-deleted executions within the hard-delete buffer on the database clock', async () => {
			const twoHoursAgo = new Date(realNow - 2 * Time.hours.toMilliseconds);
			const expired = await createExecution(
				{ status: 'success', finished: true, stoppedAt: yesterday, deletedAt: twoHoursAgo },
				workflow,
			);
			await createExecution(
				{ status: 'success', finished: true, stoppedAt: yesterday, deletedAt: new Date(realNow) },
				workflow,
			);
			moveInstanceClockAhead();

			const refs = await Container.get(ExecutionRepository).findSoftDeletedExecutions();

			expect(refs.map(({ executionId }) => executionId)).toEqual([expired.id]);
		});
	});
});
