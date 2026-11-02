import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { DataSource } from '@n8n/typeorm';

import { CredentialsEntity, Project, Role, SharedCredentials, SharedWorkflow } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { BaseRepository } from './base-repository';

class ScopeAccessProjectTable extends BaseRepository<Project> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Project, dataSource.manager, transactionRunner);
	}
}

export type CredentialSharing = Pick<SharedCredentials, 'projectId' | 'role'>;
export type WorkflowSharing = Pick<SharedWorkflow, 'projectId' | 'role'>;

/** Reads for the project and resource scope checks of a user. */
@Service()
export class ScopeAccessRepository {
	private readonly table: ScopeAccessProjectTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ScopeAccessProjectTable(dataSource, transactionRunner);
	}

	async isInstanceCredential(credentialId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.table
			.managerFor(ctx)
			.existsBy(CredentialsEntity, { id: credentialId, usageScope: 'instance' });
	}

	/** IDs of the projects in which the project role of the user has all of `scopes`. */
	async findProjectIdsWithAllScopes(
		userId: string,
		scopes: Scope[],
		ctx: OperationContext = {},
	): Promise<string[]> {
		const rows = await this.table
			.managerFor(ctx)
			.createQueryBuilder(Project, 'project')
			.innerJoin('project.projectRelations', 'relation')
			.innerJoin('relation.role', 'role')
			.innerJoin('role.scopes', 'scope')
			.where('relation.userId = :userId', { userId })
			.andWhere('scope.slug IN (:...scopes)', { scopes })
			.groupBy('project.id')
			.having('COUNT(DISTINCT scope.slug) = :scopeCount', { scopeCount: scopes.length })
			.select(['project.id AS id'])
			.getRawMany<{ id: string }>();
		return rows.map((row) => row.id);
	}

	async findCredentialSharings(
		credentialId: string,
		ctx: OperationContext = {},
	): Promise<CredentialSharing[]> {
		return await this.table.managerFor(ctx).find(SharedCredentials, {
			select: { projectId: true, role: true },
			where: { credentialsId: credentialId },
		});
	}

	async findWorkflowSharings(
		workflowId: string,
		ctx: OperationContext = {},
	): Promise<WorkflowSharing[]> {
		return await this.table.managerFor(ctx).find(SharedWorkflow, {
			select: { projectId: true, role: true },
			where: { workflowId },
		});
	}

	async findRolesForAccessCheck(ctx: OperationContext = {}): Promise<Role[]> {
		return await this.table.managerFor(ctx).find(Role, { relations: ['scopes'] });
	}
}
