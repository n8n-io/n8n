import type { DatabaseConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { In } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ScheduledJob } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import type { NewScheduledJob, ScheduledJobDefinitionUpdate } from '../scheduled-job.repository';
import { ScheduledJobRepository } from '../scheduled-job.repository';

const CLOCK = new Date('2026-01-05T09:00:00.000Z');

const newJob = (name: string): NewScheduledJob => ({
	name,
	workflowId: 'wf',
	nodeId: 'node',
	taskType: 'schedule-trigger',
	payload: {},
	kind: 'cron',
	cronExpression: '0 0 9 * * *',
	timezone: 'UTC',
	recurrenceUnit: null,
	recurrenceSize: null,
	intervalSeconds: null,
	fireAt: null,
	nextRunAt: CLOCK,
	maxAttempts: 5,
});

/** A chainable insert query-builder mock; `execute` is set per test. */
const insertQb = () => ({
	insert: vi.fn().mockReturnThis(),
	into: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	orIgnore: vi.fn().mockReturnThis(),
	returning: vi.fn().mockReturnThis(),
	execute: vi.fn(),
});

describe('ScheduledJobRepository', () => {
	const entityManager = mockEntityManager(ScheduledJob);
	// Default DI instance resolves DatabaseConfig to its sqlite default (isPostgres = false).
	const repository = Container.get(ScheduledJobRepository);
	// Postgres shares the same mocked manager; only the dialect flag differs.
	const postgresRepository = new ScheduledJobRepository(
		entityManager.connection as unknown as DataSource,
		mock<DatabaseConfig>({ type: 'postgresdb' }),
	);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('findManyByWorkflowNode', () => {
		it('returns the jobs owned by the workflow node', async () => {
			const rows = [mock<ScheduledJob>({ id: 1 }), mock<ScheduledJob>({ id: 2 })];
			entityManager.findBy.mockResolvedValueOnce(rows);

			const result = await repository.findManyByWorkflowNode(entityManager, 'wf', 'node');

			expect(entityManager.findBy).toHaveBeenCalledWith(ScheduledJob, {
				workflowId: 'wf',
				nodeId: 'node',
			});
			expect(result).toBe(rows);
		});
	});

	describe('insertMany', () => {
		it('throws when not run inside a transaction', async () => {
			const noTx = mock<EntityManager>({ queryRunner: undefined });

			await expect(repository.insertMany(noTx, [newJob('wf:node:0')])).rejects.toThrow(
				UnexpectedError,
			);
		});

		it('returns an empty array without touching the manager when there are no jobs', async () => {
			const result = await repository.insertMany(entityManager, []);

			expect(result).toEqual([]);
			expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
		});

		it('inserts with orIgnore and reads ids back by name, in input order', async () => {
			const jobs = [newJob('wf:node:0'), newJob('wf:node:1')];
			const qb = insertQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);
			// Read-back deliberately out of input order to prove the result is reordered.
			entityManager.find.mockResolvedValueOnce([
				{ id: 20, name: 'wf:node:1' } as ScheduledJob,
				{ id: 10, name: 'wf:node:0' } as ScheduledJob,
			]);

			const ids = await repository.insertMany(entityManager, jobs);

			expect(qb.values).toHaveBeenCalledWith(jobs);
			expect(qb.orIgnore).toHaveBeenCalled();
			expect(qb.returning).not.toHaveBeenCalled();
			expect(entityManager.find).toHaveBeenCalledWith(ScheduledJob, {
				where: { name: In(['wf:node:0', 'wf:node:1']) },
				select: { id: true, name: true },
			});
			expect(ids).toEqual([10, 20]);
		});

		it('chunks the insert and the read-back, then reassembles ids in input order', async () => {
			const jobs = [newJob('wf:node:0'), newJob('wf:node:1'), newJob('wf:node:2')];
			const qb = insertQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);
			// Read-back is chunked too; each chunk resolves only its own rows.
			entityManager.find
				.mockResolvedValueOnce([
					{ id: 10, name: 'wf:node:0' } as ScheduledJob,
					{ id: 20, name: 'wf:node:1' } as ScheduledJob,
				])
				.mockResolvedValueOnce([{ id: 30, name: 'wf:node:2' } as ScheduledJob]);

			// 3 jobs at 2/chunk -> two insert statements and two read-back queries.
			const ids = await repository.insertMany(entityManager, jobs, 2);

			expect(qb.values).toHaveBeenCalledTimes(2);
			expect(qb.values).toHaveBeenNthCalledWith(1, [jobs[0], jobs[1]]);
			expect(qb.values).toHaveBeenNthCalledWith(2, [jobs[2]]);
			expect(entityManager.find).toHaveBeenNthCalledWith(1, ScheduledJob, {
				where: { name: In(['wf:node:0', 'wf:node:1']) },
				select: { id: true, name: true },
			});
			expect(entityManager.find).toHaveBeenNthCalledWith(2, ScheduledJob, {
				where: { name: In(['wf:node:2']) },
				select: { id: true, name: true },
			});
			expect(ids).toEqual([10, 20, 30]);
		});

		it('caps an oversized chunk size to the dialect maximum', async () => {
			// The sqlite instance caps at 500, so 600 jobs must still span two statements even when
			// the caller passes a chunk far past the driver's limits, not collapse into one.
			const jobs = Array.from({ length: 600 }, (_, i) => newJob(`wf:node:${i}`));
			const qb = insertQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);
			entityManager.find
				.mockResolvedValueOnce(
					jobs.slice(0, 500).map((job, i) => ({ id: i + 1, name: job.name }) as ScheduledJob),
				)
				.mockResolvedValueOnce(
					jobs.slice(500).map((job, i) => ({ id: 501 + i, name: job.name }) as ScheduledJob),
				);

			const ids = await repository.insertMany(entityManager, jobs, 10_000_000);

			expect(qb.values).toHaveBeenCalledTimes(2);
			expect(entityManager.find).toHaveBeenCalledTimes(2);
			expect(ids).toHaveLength(600);
		});

		it('reads ids back by name on Postgres too, without RETURNING', async () => {
			const jobs = [newJob('wf:node:0'), newJob('wf:node:1')];
			const qb = insertQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);
			entityManager.find.mockResolvedValueOnce([
				{ id: 10, name: 'wf:node:0' } as ScheduledJob,
				{ id: 20, name: 'wf:node:1' } as ScheduledJob,
			]);

			const ids = await postgresRepository.insertMany(entityManager, jobs);

			expect(qb.returning).not.toHaveBeenCalled();
			expect(entityManager.find).toHaveBeenCalledWith(ScheduledJob, {
				where: { name: In(['wf:node:0', 'wf:node:1']) },
				select: { id: true, name: true },
			});
			expect(ids).toEqual([10, 20]);
		});

		it('returns the id of a name a concurrent writer already held', async () => {
			const jobs = [newJob('wf:node:0'), newJob('wf:node:1')];
			const qb = insertQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);
			// `wf:node:1` was already held by another writer; orIgnore skipped our row,
			// but the read-back still finds every input name (id 99 is the other writer's).
			entityManager.find.mockResolvedValueOnce([
				{ id: 10, name: 'wf:node:0' } as ScheduledJob,
				{ id: 99, name: 'wf:node:1' } as ScheduledJob,
			]);

			const ids = await repository.insertMany(entityManager, jobs);

			expect(ids).toEqual([10, 99]);
		});

		it('throws when a name has no row after insert', async () => {
			const jobs = [newJob('wf:node:0'), newJob('wf:node:1')];
			const qb = insertQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);
			// A name unexpectedly missing from the read-back must fail loud rather than
			// return a short array that would misalign the caller's index-based zip.
			entityManager.find.mockResolvedValueOnce([{ id: 10, name: 'wf:node:0' } as ScheduledJob]);

			await expect(repository.insertMany(entityManager, jobs)).rejects.toThrow(UnexpectedError);
		});
	});

	describe('updateDefinition', () => {
		it('rewrites the job schedule in place, keeping its id', async () => {
			const update: ScheduledJobDefinitionUpdate = {
				kind: 'cron',
				cronExpression: '0 0 18 * * *',
				timezone: 'UTC',
				recurrenceUnit: null,
				recurrenceSize: null,
				intervalSeconds: null,
				fireAt: null,
				nextRunAt: CLOCK,
			};

			await repository.updateDefinition(entityManager, 10, update);

			expect(entityManager.update).toHaveBeenCalledWith(ScheduledJob, { id: 10 }, update);
		});
	});

	describe('deleteManyByIds', () => {
		it('deletes the given ids', async () => {
			await repository.deleteManyByIds(entityManager, [1, 2]);

			expect(entityManager.delete).toHaveBeenCalledWith(ScheduledJob, [1, 2]);
		});

		it('is a no-op when there are no ids', async () => {
			await repository.deleteManyByIds(entityManager, []);

			expect(entityManager.delete).not.toHaveBeenCalled();
		});
	});

	describe('deleteByWorkflowNode', () => {
		it('deletes the node jobs and returns the affected count', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 3, raw: [] });

			const removed = await repository.deleteByWorkflowNode(entityManager, 'wf', 'node');

			expect(entityManager.delete).toHaveBeenCalledWith(ScheduledJob, {
				workflowId: 'wf',
				nodeId: 'node',
			});
			expect(removed).toBe(3);
		});

		it('returns 0 when the driver does not report an affected count', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: null, raw: [] });

			const removed = await repository.deleteByWorkflowNode(entityManager, 'wf', 'node');

			expect(removed).toBe(0);
		});
	});
});
