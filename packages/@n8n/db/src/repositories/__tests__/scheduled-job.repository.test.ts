import type { DatabaseConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { In, IsNull, Not } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ScheduledJob } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import type { NewScheduledJob, ScheduledJobDefinitionUpdate } from '../scheduled-job.repository';
import { ScheduledJobRepository } from '../scheduled-job.repository';

const CLOCK = new Date('2026-01-05T09:00:00.000Z');

const OWNER = { ownerType: 'workflow', ownerId: 'wf', ownerMemberId: 'node' };

const newJob = (name: string): NewScheduledJob => ({
	name,
	...OWNER,
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
	misfirePolicy: 'coalesce',
	misfireGraceSeconds: 60,
});

/** A row as the post-insert read-back returns it: id, name and the owner it belongs to. */
const insertedRow = (id: number, name: string, owner = OWNER): ScheduledJob =>
	({ id, name, ...owner }) as ScheduledJob;

/** A chainable insert query-builder mock; `execute` is set per test. */
const insertQb = () => ({
	insert: vi.fn().mockReturnThis(),
	into: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	orIgnore: vi.fn().mockReturnThis(),
	returning: vi.fn().mockReturnThis(),
	execute: vi.fn(),
});

/** A chainable update query-builder mock; `execute` is set per test. */
const updateQb = () => ({
	update: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
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

	describe('findManyByOwner', () => {
		it('returns the jobs owned by the owner member', async () => {
			const rows = [mock<ScheduledJob>({ id: 1 }), mock<ScheduledJob>({ id: 2 })];
			entityManager.findBy.mockResolvedValueOnce(rows);

			const result = await repository.findManyByOwner(entityManager, OWNER);

			expect(entityManager.findBy).toHaveBeenCalledWith(ScheduledJob, OWNER);
			expect(result).toBe(rows);
		});

		it('matches a member-less owner with IS NULL rather than = NULL', async () => {
			entityManager.findBy.mockResolvedValueOnce([]);

			await repository.findManyByOwner(entityManager, {
				ownerType: 'system-task',
				ownerId: 'system:prune',
				ownerMemberId: null,
			});

			expect(entityManager.findBy).toHaveBeenCalledWith(ScheduledJob, {
				ownerType: 'system-task',
				ownerId: 'system:prune',
				ownerMemberId: IsNull(),
			});
		});
	});

	describe('countByOwner', () => {
		it('counts the jobs owned by the owner member', async () => {
			entityManager.count.mockResolvedValueOnce(3);

			const result = await repository.countByOwner(OWNER);

			expect(entityManager.count).toHaveBeenCalledWith(ScheduledJob, { where: OWNER });
			expect(result).toBe(3);
		});
	});

	describe('backdateNextRunAt', () => {
		it('sets nextRunAt to secondsAgo in the past for the node jobs', async () => {
			const qb = updateQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);

			await repository.backdateNextRunAt(OWNER, 120);

			expect(qb.update).toHaveBeenCalledWith(ScheduledJob);
			expect(qb.set).toHaveBeenCalledWith({ nextRunAt: expect.any(Function) });
			expect(qb.where).toHaveBeenCalledWith(
				'"ownerType" = :ownerType AND "ownerId" = :ownerId AND "ownerMemberId" = :ownerMemberId',
				OWNER,
			);
			expect(qb.execute).toHaveBeenCalled();
		});

		it('sets nextRunAt to now when secondsAgo is 0', async () => {
			const qb = updateQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);

			await repository.backdateNextRunAt(OWNER, 0);

			expect(qb.set).toHaveBeenCalledWith({ nextRunAt: expect.any(Function) });
			expect(qb.execute).toHaveBeenCalled();
		});

		it('matches a member-less owner with IS NULL', async () => {
			const qb = updateQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);

			const owner = { ownerType: 'system-task', ownerId: 'system:prune', ownerMemberId: null };
			await repository.backdateNextRunAt(owner, 0);

			expect(qb.where).toHaveBeenCalledWith(
				'"ownerType" = :ownerType AND "ownerId" = :ownerId AND "ownerMemberId" IS NULL',
				owner,
			);
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
				insertedRow(20, 'wf:node:1'),
				insertedRow(10, 'wf:node:0'),
			]);

			const ids = await repository.insertMany(entityManager, jobs);

			expect(qb.values).toHaveBeenCalledWith(jobs);
			expect(qb.orIgnore).toHaveBeenCalled();
			expect(qb.returning).not.toHaveBeenCalled();
			expect(entityManager.find).toHaveBeenCalledWith(ScheduledJob, {
				where: { name: In(['wf:node:0', 'wf:node:1']) },
				select: { id: true, name: true, ownerType: true, ownerId: true, ownerMemberId: true },
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
				.mockResolvedValueOnce([insertedRow(10, 'wf:node:0'), insertedRow(20, 'wf:node:1')])
				.mockResolvedValueOnce([insertedRow(30, 'wf:node:2')]);

			// 3 jobs at 2/chunk -> two insert statements and two read-back queries.
			const ids = await repository.insertMany(entityManager, jobs, 2);

			expect(qb.values).toHaveBeenCalledTimes(2);
			expect(qb.values).toHaveBeenNthCalledWith(1, [jobs[0], jobs[1]]);
			expect(qb.values).toHaveBeenNthCalledWith(2, [jobs[2]]);
			expect(entityManager.find).toHaveBeenNthCalledWith(1, ScheduledJob, {
				where: { name: In(['wf:node:0', 'wf:node:1']) },
				select: { id: true, name: true, ownerType: true, ownerId: true, ownerMemberId: true },
			});
			expect(entityManager.find).toHaveBeenNthCalledWith(2, ScheduledJob, {
				where: { name: In(['wf:node:2']) },
				select: { id: true, name: true, ownerType: true, ownerId: true, ownerMemberId: true },
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
				.mockResolvedValueOnce(jobs.slice(0, 500).map((job, i) => insertedRow(i + 1, job.name)))
				.mockResolvedValueOnce(jobs.slice(500).map((job, i) => insertedRow(501 + i, job.name)));

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
				insertedRow(10, 'wf:node:0'),
				insertedRow(20, 'wf:node:1'),
			]);

			const ids = await postgresRepository.insertMany(entityManager, jobs);

			expect(qb.returning).not.toHaveBeenCalled();
			expect(entityManager.find).toHaveBeenCalledWith(ScheduledJob, {
				where: { name: In(['wf:node:0', 'wf:node:1']) },
				select: { id: true, name: true, ownerType: true, ownerId: true, ownerMemberId: true },
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
				insertedRow(10, 'wf:node:0'),
				insertedRow(99, 'wf:node:1'),
			]);

			const ids = await repository.insertMany(entityManager, jobs);

			expect(ids).toEqual([10, 99]);
		});

		it('throws when the row holding a name belongs to another owner', async () => {
			// Job names are scoped by convention, not by the schema. Returning the other
			// owner's id would have this call reseed and reschedule their job.
			const jobs = [newJob('wf:node:0')];
			const qb = insertQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);
			entityManager.find.mockResolvedValueOnce([
				insertedRow(10, 'wf:node:0', { ...OWNER, ownerMemberId: 'other-node' }),
			]);

			await expect(repository.insertMany(entityManager, jobs)).rejects.toThrow(
				'Scheduled job name is already taken by another owner',
			);
		});

		it('throws when a name has no row after insert', async () => {
			const jobs = [newJob('wf:node:0'), newJob('wf:node:1')];
			const qb = insertQb();
			qb.execute.mockResolvedValue(undefined);
			entityManager.createQueryBuilder.mockReturnValue(qb as never);
			// A name unexpectedly missing from the read-back must fail loud rather than
			// return a short array that would misalign the caller's index-based zip.
			entityManager.find.mockResolvedValueOnce([insertedRow(10, 'wf:node:0')]);

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
				maxAttempts: 3,
				misfirePolicy: 'skip',
				misfireGraceSeconds: 120,
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

	describe('deleteByOwnerMember', () => {
		it('deletes the owner member jobs and returns the affected count', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 3, raw: [] });

			const removed = await repository.deleteByOwnerMember(entityManager, OWNER);

			expect(entityManager.delete).toHaveBeenCalledWith(ScheduledJob, OWNER);
			expect(removed).toBe(3);
		});

		it('returns 0 when the driver does not report an affected count', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: null, raw: [] });

			const removed = await repository.deleteByOwnerMember(entityManager, OWNER);

			expect(removed).toBe(0);
		});
	});

	describe('deleteByOwnerRef', () => {
		it('deletes every job the owner holds, whichever member owns it', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 5, raw: [] });

			const removed = await repository.deleteByOwnerRef(entityManager, {
				ownerType: 'workflow',
				ownerId: 'wf',
			});

			expect(entityManager.delete).toHaveBeenCalledWith(ScheduledJob, {
				ownerType: 'workflow',
				ownerId: 'wf',
			});
			expect(removed).toBe(5);
		});
	});

	describe('deleteByOwnerTaskType', () => {
		it("deletes the owner's jobs of one task type", async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 2, raw: [] });

			const removed = await repository.deleteByOwnerTaskType(
				entityManager,
				{ ownerType: 'workflow', ownerId: 'wf' },
				'workflow:schedule-trigger',
			);

			expect(entityManager.delete).toHaveBeenCalledWith(ScheduledJob, {
				ownerType: 'workflow',
				ownerId: 'wf',
				taskType: 'workflow:schedule-trigger',
			});
			expect(removed).toBe(2);
		});
	});

	describe('quarantineByOwnerIds', () => {
		it('is a no-op with no owner ids', async () => {
			expect(await repository.quarantineByOwnerIds('workflow', [], CLOCK, CLOCK)).toBe(0);
			expect(entityManager.transaction).not.toHaveBeenCalled();
		});

		it('withdraws the queued runs of quarantined rows only, so a row revived in between keeps its runs', async () => {
			entityManager.transaction.mockImplementation(
				async (work) =>
					await (work as unknown as (manager: EntityManager) => Promise<unknown>)(entityManager),
			);
			const qb = {
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				delete: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue({ affected: 1, raw: [] }),
			};
			entityManager.createQueryBuilder.mockReturnValue(qb as never);

			const quarantined = await repository.quarantineByOwnerIds('workflow', ['wf'], CLOCK, CLOCK);

			expect(quarantined).toBe(1);
			const [withdrawal] = qb.andWhere.mock.calls
				.map(([sql]) => sql as string)
				.filter((sql) => sql.includes('"jobId" IN'));
			expect(withdrawal).toContain('"orphanedAt" IS NOT NULL');
			expect(withdrawal).not.toContain('"createdAt"');
		});
	});

	describe('deleteQuarantinedByOwnerIds', () => {
		it('is a no-op with no owner ids', async () => {
			expect(await repository.deleteQuarantinedByOwnerIds('workflow', [], CLOCK)).toBe(0);
			expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
		});
	});

	describe('findQuarantinedByOwnerIds', () => {
		it('is a no-op with no owner ids', async () => {
			expect(await repository.findQuarantinedByOwnerIds('workflow', [], 10)).toEqual([]);
			expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
		});
	});

	describe('liftQuarantine', () => {
		it('clears the stamp and restarts the clock, only while still quarantined', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, raw: [], generatedMaps: [] });

			const lifted = await repository.liftQuarantine(42, CLOCK);

			expect(entityManager.update).toHaveBeenCalledWith(
				ScheduledJob,
				{ id: 42, orphanedAt: Not(IsNull()) },
				{ orphanedAt: null, nextRunAt: CLOCK },
			);
			expect(lifted).toBe(1);
		});

		it('reports nothing lifted when a concurrent lift or delete got there first', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 0, raw: [], generatedMaps: [] });

			expect(await repository.liftQuarantine(42, CLOCK)).toBe(0);
		});
	});
});
