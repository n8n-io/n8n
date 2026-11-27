import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ProjectPoolSettings } from '../../entities';
import { TransactionRunner } from '../../services/transaction';
import { TypeOrmTransactionRunner } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ProjectPoolSettingsRepository } from '../project-pool-settings.repository.ee';

describe('ProjectPoolSettingsRepository', () => {
	const entityManager = mockEntityManager(ProjectPoolSettings);
	Container.set(TransactionRunner, mock<TransactionRunner>());
	const repo = Container.get(ProjectPoolSettingsRepository);

	const createRunnerWithTxManager = () => {
		const transactionManager = mock<EntityManager>();
		const dataSource = mock<DataSource>({
			transaction: async <T>(run: string | ((manager: EntityManager) => Promise<T>)) => {
				if (typeof run === 'string') throw new Error('Unexpected isolation level');
				return await run(transactionManager);
			},
		});
		const runner = new TypeOrmTransactionRunner(dataSource, mock<Logger>());
		return { runner, transactionManager };
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('getDefaultPool', () => {
		it('returns the default pool for a project', async () => {
			entityManager.findOne.mockResolvedValueOnce(
				Object.assign(new ProjectPoolSettings(), { projectId: 'project-1', defaultPool: 'gpu' }),
			);

			const result = await repo.getDefaultPool('project-1', {});

			expect(result).toBe('gpu');
			expect(entityManager.findOne).toHaveBeenCalledWith(ProjectPoolSettings, {
				where: { projectId: 'project-1' },
				select: ['defaultPool'],
			});
		});

		it('returns null when no row exists for the project', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			expect(await repo.getDefaultPool('project-1', {})).toBeNull();
		});

		it('returns null when the stored default pool is null', async () => {
			entityManager.findOne.mockResolvedValueOnce(
				Object.assign(new ProjectPoolSettings(), { projectId: 'project-1', defaultPool: null }),
			);

			expect(await repo.getDefaultPool('project-1', {})).toBeNull();
		});

		it('routes reads through the active transaction manager', async () => {
			const { runner, transactionManager } = createRunnerWithTxManager();
			transactionManager.findOne.mockResolvedValueOnce(
				Object.assign(new ProjectPoolSettings(), { projectId: 'project-1', defaultPool: 'gpu' }),
			);

			const result = await runner.run({}, async (ctx) => {
				return await repo.getDefaultPool('project-1', ctx);
			});

			expect(result).toBe('gpu');
			expect(transactionManager.findOne).toHaveBeenCalledWith(ProjectPoolSettings, {
				where: { projectId: 'project-1' },
				select: ['defaultPool'],
			});
			expect(entityManager.findOne).not.toHaveBeenCalled();
		});
	});

	describe('setDefaultPool', () => {
		it('upserts the default pool using projectId as the conflict path', async () => {
			await repo.setDefaultPool('project-1', 'gpu', {});

			expect(entityManager.upsert).toHaveBeenCalledWith(
				ProjectPoolSettings,
				{ projectId: 'project-1', defaultPool: 'gpu' },
				['projectId'],
			);
		});

		it('upserts null when clearing the default pool', async () => {
			await repo.setDefaultPool('project-1', null, {});

			expect(entityManager.upsert).toHaveBeenCalledWith(
				ProjectPoolSettings,
				{ projectId: 'project-1', defaultPool: null },
				['projectId'],
			);
		});

		it('routes writes through the active transaction manager', async () => {
			const { runner, transactionManager } = createRunnerWithTxManager();

			await runner.run({}, async (ctx) => {
				await repo.setDefaultPool('project-1', 'gpu', ctx);
			});

			expect(transactionManager.upsert).toHaveBeenCalledWith(
				ProjectPoolSettings,
				{ projectId: 'project-1', defaultPool: 'gpu' },
				['projectId'],
			);
			expect(entityManager.upsert).not.toHaveBeenCalled();
		});
	});

	describe('repository boundary', () => {
		it('does not expose TypeORM repository methods or manager', () => {
			expect('find' in repo).toBe(false);
			expect('findOne' in repo).toBe(false);
			expect('save' in repo).toBe(false);
			expect('delete' in repo).toBe(false);
			expect('upsert' in repo).toBe(false);
			expect('createQueryBuilder' in repo).toBe(false);
			expect('manager' in repo).toBe(false);
		});
	});
});
