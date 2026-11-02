import type { SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import {
	CredentialsEntity,
	Project,
	Role,
	SharedCredentials,
	SharedWorkflow,
} from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ScopeAccessRepository } from '../scope-access.repository';

describe('ScopeAccessRepository', () => {
	const manager = mockEntityManager(Project);
	const repository = new ScopeAccessRepository(manager.connection, mock<TransactionRunner>());

	beforeEach(() => vi.resetAllMocks());

	it('checks for an instance credential', async () => {
		manager.existsBy.mockResolvedValue(true);

		await expect(repository.isInstanceCredential('credential-1')).resolves.toBe(true);
		expect(manager.existsBy).toHaveBeenCalledWith(CredentialsEntity, {
			id: 'credential-1',
			usageScope: 'instance',
		});
	});

	it('finds the projects in which the user has all scopes', async () => {
		const query = mock<SelectQueryBuilder<Project>>();
		for (const method of [
			'innerJoin',
			'where',
			'andWhere',
			'groupBy',
			'having',
			'select',
		] as const) {
			query[method].mockReturnValue(query);
		}
		query.getRawMany.mockResolvedValue([{ id: 'project-1' }, { id: 'project-2' }]);
		manager.createQueryBuilder.mockReturnValue(query);

		await expect(
			repository.findProjectIdsWithAllScopes('user-1', ['workflow:read', 'workflow:update']),
		).resolves.toEqual(['project-1', 'project-2']);
		expect(manager.createQueryBuilder).toHaveBeenCalledWith(Project, 'project');
		expect(query.where).toHaveBeenCalledWith('relation.userId = :userId', { userId: 'user-1' });
		expect(query.having).toHaveBeenCalledWith('COUNT(DISTINCT scope.slug) = :scopeCount', {
			scopeCount: 2,
		});
	});

	it('finds the sharings of a credential and a workflow', async () => {
		manager.find.mockResolvedValue([]);

		await repository.findCredentialSharings('credential-1');
		await repository.findWorkflowSharings('workflow-1');

		expect(manager.find).toHaveBeenCalledWith(SharedCredentials, {
			select: { projectId: true, role: true },
			where: { credentialsId: 'credential-1' },
		});
		expect(manager.find).toHaveBeenCalledWith(SharedWorkflow, {
			select: { projectId: true, role: true },
			where: { workflowId: 'workflow-1' },
		});
	});

	it('uses the operation context transaction for reads', async () => {
		const transactionManager = mockEntityManager(Project);
		transactionManager.find.mockResolvedValue([]);

		await repository.findRolesForAccessCheck({ trx: new TypeOrmTransaction(transactionManager) });

		expect(transactionManager.find).toHaveBeenCalledWith(Role, { relations: ['scopes'] });
		expect(manager.find).not.toHaveBeenCalled();
	});
});
