import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { Mock } from 'vitest';

import { ProjectExecutionCounter } from '../../entities/project-execution-counter';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { ProjectExecutionCounterRepository } from '../project-execution-counter.repository';

/**
 * This package's repository tests mock the `EntityManager` rather than
 * hitting a real DB (see every other file in this directory) because
 * `@n8n/backend-test-utils` (which provides `testDb`/`createTeamProject`/
 * `createWorkflow`) itself depends on `@n8n/db` — adding it here as a
 * devDependency creates a workspace/build cycle that `turbo run build`
 * refuses to resolve ("Cyclic dependency detected: @n8n/db#build,
 * @n8n/backend-test-utils#build"). Real end-to-end coverage of this
 * repository belongs in a consuming package (e.g. the Task 4 service test
 * in `packages/cli`), where `@n8n/backend-test-utils` is already a normal
 * dependency.
 */
describe('ProjectExecutionCounterRepository', () => {
	const entityManager = mockEntityManager(ProjectExecutionCounter);
	const logger = mockInstance(Logger);
	const repo = Container.get(ProjectExecutionCounterRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('incrementWorkflowCount', () => {
		it('inserts a new row with count 1 when none exists yet', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(null);
			entityManager.insert.mockResolvedValueOnce({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			await repo.incrementWorkflowCount('project-1', 'workflow-1', 'day', '2026-09-01');

			expect(entityManager.findOneBy.mock.calls[0]?.[1]).toEqual({
				projectId: 'project-1',
				workflowId: 'workflow-1',
				periodUnit: 'day',
				periodStart: '2026-09-01',
			});
			expect(entityManager.insert.mock.calls[0]?.[1]).toEqual({
				projectId: 'project-1',
				workflowId: 'workflow-1',
				periodUnit: 'day',
				periodStart: '2026-09-01',
				count: 1,
			});
			expect(entityManager.increment).not.toHaveBeenCalled();
		});

		it('increments the existing row by id on repeat calls', async () => {
			entityManager.findOneBy.mockResolvedValueOnce({
				id: 42,
				projectId: 'project-1',
				workflowId: 'workflow-1',
				periodUnit: 'day',
				periodStart: '2026-09-01',
				count: 3,
			} as ProjectExecutionCounter);
			entityManager.increment.mockResolvedValueOnce({
				affected: 1,
				generatedMaps: [],
				raw: [],
			});

			await repo.incrementWorkflowCount('project-1', 'workflow-1', 'day', '2026-09-01');

			expect(entityManager.increment.mock.calls[0]?.[1]).toEqual({ id: 42 });
			expect(entityManager.increment.mock.calls[0]?.[2]).toBe('count');
			expect(entityManager.increment.mock.calls[0]?.[3]).toBe(1);
			expect(entityManager.insert).not.toHaveBeenCalled();
		});

		it('falls back to a composite-key increment when a concurrent insert wins the race', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(null);
			const insertError = new Error('UNIQUE constraint failed');
			(entityManager.insert as Mock).mockRejectedValueOnce(insertError);
			entityManager.increment.mockResolvedValueOnce({
				affected: 1,
				generatedMaps: [],
				raw: [],
			});

			await repo.incrementWorkflowCount('project-1', 'workflow-1', 'day', '2026-09-01');

			expect(entityManager.increment.mock.calls[0]?.[1]).toEqual({
				projectId: 'project-1',
				workflowId: 'workflow-1',
				periodUnit: 'day',
				periodStart: '2026-09-01',
			});
			expect(entityManager.increment.mock.calls[0]?.[2]).toBe('count');
			expect(entityManager.increment.mock.calls[0]?.[3]).toBe(1);
		});

		it('logs the swallowed insert error before falling back to increment, so a masked failure still leaves a trace', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(null);
			const insertError = new Error('connection terminated unexpectedly');
			(entityManager.insert as Mock).mockRejectedValueOnce(insertError);
			entityManager.increment.mockResolvedValueOnce({
				affected: 1,
				generatedMaps: [],
				raw: [],
			});

			await repo.incrementWorkflowCount('project-1', 'workflow-1', 'day', '2026-09-01');

			expect(logger.error).toHaveBeenCalledWith(
				'Insert failed while incrementing project execution count',
				expect.objectContaining({
					error: insertError,
					projectId: 'project-1',
					workflowId: 'workflow-1',
					periodUnit: 'day',
					periodStart: '2026-09-01',
				}),
			);
			// Still falls through to increment even though the failure wasn't the
			// expected unique-constraint race — this is the documented trade-off,
			// not a bug: the point of the log is visibility, not narrowing.
			expect(entityManager.increment).toHaveBeenCalledTimes(1);
		});
	});

	describe('getProjectPeriodTotal', () => {
		const queryBuilderReturning = (total: string) => {
			const qb = {
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				getRawOne: vi.fn().mockResolvedValue({ total }),
			};
			(entityManager.createQueryBuilder as Mock).mockReturnValue(qb);
			return qb;
		};

		it('sums the count column scoped to project, periodUnit, and periodStart', async () => {
			const qb = queryBuilderReturning('3');

			const total = await repo.getProjectPeriodTotal('project-1', 'day', '2026-09-01');

			expect(qb.where).toHaveBeenCalledWith('counter.projectId = :projectId', {
				projectId: 'project-1',
			});
			expect(qb.andWhere).toHaveBeenCalledWith('counter.periodUnit = :periodUnit', {
				periodUnit: 'day',
			});
			expect(qb.andWhere).toHaveBeenCalledWith('counter.periodStart = :periodStart', {
				periodStart: '2026-09-01',
			});
			expect(total).toBe(3);
		});

		it('returns 0 when no rows match the bucket', async () => {
			queryBuilderReturning('0');

			expect(await repo.getProjectPeriodTotal('project-1', 'day', '2026-09-02')).toBe(0);
		});
	});

	describe('getWorkflowDailyCount', () => {
		it('returns 0 when no rows exist for the workflow', async () => {
			const qb = {
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				getRawOne: vi.fn().mockResolvedValue({ total: '0' }),
			};
			(entityManager.createQueryBuilder as Mock).mockReturnValue(qb);

			expect(await repo.getWorkflowDailyCount('workflow-1', '2026-09-01')).toBe(0);
			expect(qb.where).toHaveBeenCalledWith('counter.workflowId = :workflowId', {
				workflowId: 'workflow-1',
			});
		});

		it('scopes to the day bucket, not just the workflow', async () => {
			const qb = {
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				getRawOne: vi.fn().mockResolvedValue({ total: '5' }),
			};
			(entityManager.createQueryBuilder as Mock).mockReturnValue(qb);

			const total = await repo.getWorkflowDailyCount('workflow-1', '2026-09-01');

			// [0] is the 'day'-literal filter (no params — the unit itself isn't
			// caller-supplied), [1] is the caller-supplied day bucket. A
			// regression that dropped the unit filter, or passed the wrong
			// variable into `:day`, would go undetected without asserting both.
			expect(qb.andWhere.mock.calls[0]?.[0]).toBe("counter.periodUnit = 'day'");
			expect(qb.andWhere.mock.calls[1]?.[0]).toBe('counter.periodStart = :day');
			expect(qb.andWhere.mock.calls[1]?.[1]).toEqual({ day: '2026-09-01' });
			expect(total).toBe(5);
		});
	});
});
