import type { DatabaseConfig } from '@n8n/config';
import type { DataSource, Driver, EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { User } from '../../entities';
import { WorkflowDependency, WorkflowEntity } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import type { SharedWorkflowRepository } from '../shared-workflow.repository';
import {
	WorkflowDependencies,
	WorkflowDependencyRepository,
} from '../workflow-dependency.repository';

describe('WorkflowDependencyRepository', () => {
	const entityManager = mockEntityManager(WorkflowDependency);
	const transactionRunner = mock<TransactionRunner>();
	const databaseConfig = mock<DatabaseConfig>({ type: 'sqlite', tablePrefix: '' });
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();

	let repository: WorkflowDependencyRepository;

	const createTransactionManager = () => {
		const escape = vi.fn((name: string) => `"${name}"`);
		const driver = mock<Driver>({ escape });
		const connection = mock<DataSource>({ driver });
		return {
			escape,
			txManager: mock<EntityManager>({ connection }),
		};
	};

	beforeEach(() => {
		vi.resetAllMocks();
		databaseConfig.type = 'sqlite';
		databaseConfig.tablePrefix = '';
		repository = new WorkflowDependencyRepository(
			entityManager.connection,
			transactionRunner,
			databaseConfig,
			sharedWorkflowRepository,
		);
	});

	it('keeps transaction primitives and TypeORM escape hatches out of the repository contract', () => {
		expect(repository).not.toHaveProperty('managerFor');
		expect(repository).not.toHaveProperty('runInTransaction');
		expect(repository).not.toHaveProperty('manager');
		expect(repository).not.toHaveProperty('createQueryBuilder');
	});

	describe('countWorkflowsInScope', () => {
		it('queries scoped draft dependencies under the dependency alias', async () => {
			const user = mock<User>({ id: 'user-1' });
			const readableSubquery = mock<SelectQueryBuilder<WorkflowDependency>>();
			readableSubquery.getQuery.mockReturnValue('SELECT sw.workflowId FROM shared_workflow sw');
			readableSubquery.getParameters.mockReturnValue({ userId: 'user-1' });
			sharedWorkflowRepository.buildSharedWorkflowIdsSubquery.mockReturnValueOnce(readableSubquery);

			const qb = mock<SelectQueryBuilder<WorkflowDependency>>();
			qb.innerJoin.mockReturnThis();
			qb.where.mockReturnThis();
			qb.andWhere.mockReturnThis();
			qb.setParameters.mockReturnThis();
			qb.select.mockReturnThis();
			qb.getRawOne.mockResolvedValueOnce({ total: '4' });
			entityManager.createQueryBuilder.mockReturnValueOnce(qb);

			const result = await repository.countWorkflowsInScope(
				user,
				{ projectRoles: ['project:admin'], workflowRoles: ['workflow:owner'] },
				{},
			);

			expect(result).toBe(4);
			expect(entityManager.createQueryBuilder).toHaveBeenCalledWith(
				WorkflowDependency,
				'dependency',
			);
			expect(qb.innerJoin).toHaveBeenCalledWith(
				WorkflowEntity,
				'workflow',
				'workflow.id = dependency.workflowId',
			);
			expect(qb.where).toHaveBeenCalledWith('dependency.publishedVersionId IS NULL');
			expect(qb.andWhere).toHaveBeenCalledWith('workflow.isArchived = :isArchived', {
				isArchived: false,
			});
		});
	});

	describe('updateDependenciesForWorkflow', () => {
		it('creates dependency entities with tx.create before inserting when no rows exist', async () => {
			const { txManager } = createTransactionManager();
			transactionRunner.run.mockImplementationOnce(async (ctx, fn) => {
				return await fn({ ...ctx, trx: new TypeOrmTransaction(txManager) });
			});
			txManager.delete
				.mockResolvedValueOnce({ affected: 0, raw: {} })
				.mockResolvedValueOnce({ affected: 0, raw: {} });
			txManager.findOne.mockResolvedValueOnce(null);
			txManager.existsBy.mockResolvedValueOnce(false);
			txManager.create.mockImplementation((_entityClass, entityLike) => {
				return Object.assign(new WorkflowDependency(), entityLike);
			});

			const dependencies = new WorkflowDependencies('wf-1', 1);
			dependencies.add({
				dependencyType: 'nodeType',
				dependencyKey: 'n8n-nodes-base.httpRequest',
				dependencyInfo: null,
			});

			const updated = await repository.updateDependenciesForWorkflow('wf-1', dependencies, {});

			expect(updated).toBe(true);
			expect(txManager.create).toHaveBeenCalledWith(
				WorkflowDependency,
				dependencies.dependencies[0],
			);
			expect(txManager.insert).toHaveBeenCalledWith(WorkflowDependency, [
				expect.objectContaining({
					workflowId: 'wf-1',
					workflowVersionId: 1,
					dependencyType: 'nodeType',
					dependencyKey: 'n8n-nodes-base.httpRequest',
					dependencyInfo: null,
				}),
			]);
		});
	});

	describe('findUnpublishedWorkflowIdsWithPublishedDependencies', () => {
		it('queries unpublished workflows under the dependency alias and returns their ids', async () => {
			const qb = mock<SelectQueryBuilder<WorkflowDependency>>();
			qb.innerJoin.mockReturnThis();
			qb.where.mockReturnThis();
			qb.andWhere.mockReturnThis();
			qb.select.mockReturnThis();
			qb.distinct.mockReturnThis();
			qb.getRawMany.mockResolvedValueOnce([{ workflowId: 'wf-1' }, { workflowId: 'wf-2' }]);
			entityManager.createQueryBuilder.mockReturnValueOnce(qb);

			const ids = await repository.findUnpublishedWorkflowIdsWithPublishedDependencies({});

			expect(ids).toEqual(['wf-1', 'wf-2']);
			expect(entityManager.createQueryBuilder).toHaveBeenCalledWith(
				WorkflowDependency,
				'dependency',
			);
			expect(qb.innerJoin).toHaveBeenCalledWith(
				WorkflowEntity,
				'workflow',
				'workflow.id = dependency.workflowId',
			);
		});
	});

	describe('removePublishedDependenciesForUnpublishedWorkflow', () => {
		it('locks the escaped prefixed workflow_entity row on Postgres before deleting', async () => {
			databaseConfig.type = 'postgresdb';
			databaseConfig.tablePrefix = 'n8n_';
			const { escape, txManager } = createTransactionManager();
			transactionRunner.run.mockImplementationOnce(async (ctx, fn) => {
				return await fn({ ...ctx, trx: new TypeOrmTransaction(txManager) });
			});
			txManager.findOne.mockResolvedValueOnce(null);
			txManager.delete.mockResolvedValueOnce({ affected: 2, raw: {} });

			const removed = await repository.removePublishedDependenciesForUnpublishedWorkflow(
				'wf-1',
				{},
			);

			expect(removed).toBe(true);
			expect(escape).toHaveBeenCalledWith('n8n_workflow_entity');
			expect(txManager.query).toHaveBeenCalledWith(
				'SELECT id FROM "n8n_workflow_entity" WHERE id = $1 FOR UPDATE',
				['wf-1'],
			);
		});
	});
});
