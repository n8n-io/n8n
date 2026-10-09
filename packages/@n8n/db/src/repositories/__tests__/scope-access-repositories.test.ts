import { mock } from 'vitest-mock-extended';

import { In } from '@n8n/typeorm';

import { Role, SharedCredentials, SharedWorkflow } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { RoleRepository } from '../role.repository';
import { SharedCredentialsRepository } from '../shared-credentials.repository';
import { SharedWorkflowRepository } from '../shared-workflow.repository';
import type { WorkflowPublishHistoryRepository } from '../workflow-publish-history.repository';

describe('scope access repositories', () => {
	const transactionRunner = mock<TransactionRunner>();

	describe('SharedCredentialsRepository', () => {
		const manager = mockEntityManager(SharedCredentials);
		const repository = new SharedCredentialsRepository(manager.connection, transactionRunner);

		beforeEach(() => vi.resetAllMocks());

		it('constrains access by credential, project, and role', async () => {
			manager.existsBy.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

			await expect(
				repository.findScopeAccess('credential-1', ['project-1'], ['credential:owner']),
			).resolves.toEqual({ exists: true, hasAccess: true });
			expect(manager.existsBy).toHaveBeenLastCalledWith(SharedCredentials, {
				credentialsId: 'credential-1',
				projectId: In(['project-1']),
				role: In(['credential:owner']),
			});
		});

		it('preserves existence when the access query does not match', async () => {
			manager.existsBy.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

			await expect(
				repository.findScopeAccess('credential-1', ['other-project'], ['credential:user']),
			).resolves.toEqual({ exists: true, hasAccess: false });
		});
	});

	describe('SharedWorkflowRepository', () => {
		const manager = mockEntityManager(SharedWorkflow);
		const repository = new SharedWorkflowRepository(
			manager.connection,
			transactionRunner,
			mock<WorkflowPublishHistoryRepository>(),
		);

		beforeEach(() => vi.resetAllMocks());

		it('constrains access by workflow, project, and role', async () => {
			manager.existsBy.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

			await expect(
				repository.findScopeAccess('workflow-1', ['project-1'], ['workflow:owner']),
			).resolves.toEqual({ exists: true, hasAccess: true });
			expect(manager.existsBy).toHaveBeenLastCalledWith(SharedWorkflow, {
				workflowId: 'workflow-1',
				projectId: In(['project-1']),
				role: In(['workflow:owner']),
			});
		});

		it.each([
			{ projectIds: ['other-project'], roles: ['workflow:owner'] },
			{ projectIds: ['project-1'], roles: ['workflow:editor'] },
		])('preserves existence when access does not match', async ({ projectIds, roles }) => {
			manager.existsBy.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

			await expect(repository.findScopeAccess('workflow-1', projectIds, roles)).resolves.toEqual({
				exists: true,
				hasAccess: false,
			});
		});

		it('reports a missing workflow separately', async () => {
			manager.existsBy.mockResolvedValueOnce(false);

			await expect(
				repository.findScopeAccess('missing', ['project-1'], ['workflow:owner']),
			).resolves.toEqual({ exists: false, hasAccess: false });
			expect(manager.existsBy).toHaveBeenCalledOnce();
		});
	});

	describe('RoleRepository', () => {
		const manager = mockEntityManager(Role);
		const repository = new RoleRepository(manager.connection, transactionRunner);

		it('loads role scopes through the operation context transaction', async () => {
			const transactionManager = mockEntityManager(Role);
			transactionManager.find.mockResolvedValue([]);

			await repository.findAll({
				trx: new TypeOrmTransaction(transactionManager),
			});

			expect(transactionManager.find).toHaveBeenCalledWith(Role, { relations: ['scopes'] });
			expect(manager.find).not.toHaveBeenCalled();
		});
	});
});
