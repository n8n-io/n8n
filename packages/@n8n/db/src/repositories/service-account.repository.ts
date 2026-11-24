import { Service } from '@n8n/di';
import { PROJECT_AGENT_ROLE_SLUG, PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { DataSource, In } from '@n8n/typeorm';
import { UnexpectedError } from '@n8n/errors';

import { BaseRepository } from './base-repository';
import {
	Project,
	ProjectRelation,
	type Role,
	ServiceAccount,
	ServiceAccountDetails,
} from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class ServiceAccountTable extends BaseRepository<ServiceAccount> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ServiceAccount, dataSource.manager, transactionRunner);
	}

	override managerFor(ctx: OperationContext) {
		return super.managerFor(ctx);
	}
}

export type NewServiceAccount = {
	name: string;
	role: Role;
};

/**
 * Loads service accounts only. Each query filters on `kind = 'service'`. The
 * service account comes back with its `details`.
 */
@Service()
export class ServiceAccountRepository {
	private readonly table: ServiceAccountTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ServiceAccountTable(dataSource, transactionRunner);
	}

	async findById(id: string, ctx: OperationContext = {}): Promise<ServiceAccount | null> {
		return await this.table.managerFor(ctx).findOne(ServiceAccount, {
			where: { id },
			relations: { details: true },
		});
	}

	/**
	 * Loads the account with its global role, so a permission check can run
	 * against it. An agent run acts as this account.
	 */
	async findActingAccount(id: string, ctx: OperationContext = {}): Promise<ServiceAccount | null> {
		return await this.table.managerFor(ctx).findOne(ServiceAccount, {
			where: { id },
			relations: { details: true, role: true },
		});
	}

	/** The name of each account, by its id. Unknown ids are left out. */
	async findNames(ids: string[]): Promise<Map<string, string>> {
		if (ids.length === 0) return new Map();
		const accounts = await this.table.manager.find(ServiceAccount, { where: { id: In(ids) } });
		return new Map(accounts.map((account) => [account.id, account.details.name]));
	}

	async setDisabled(id: string, disabled: boolean, ctx: OperationContext = {}): Promise<void> {
		await this.table.managerFor(ctx).update(ServiceAccount, { id }, { disabled });
	}

	/** Whether the account has the `project:agent` role in the project. */
	async isAgentOfProject(id: string, projectId: string): Promise<boolean> {
		return await this.table.manager.existsBy(ProjectRelation, {
			projectId,
			userId: id,
			role: { slug: PROJECT_AGENT_ROLE_SLUG },
		});
	}

	/** The accounts that have the `project:agent` role in the project. */
	async findAgentAccountIdsInProject(projectId: string): Promise<string[]> {
		const relations = await this.table.manager.find(ProjectRelation, {
			select: { userId: true },
			where: { projectId, role: { slug: PROJECT_AGENT_ROLE_SLUG } },
		});
		return relations.map((relation) => relation.userId);
	}

	/** Removes the `project:agent` role of the account in the project. */
	async leaveProjectAsAgent(id: string, projectId: string, ctx: OperationContext = {}) {
		await this.table.managerFor(ctx).delete(ProjectRelation, {
			projectId,
			userId: id,
			role: { slug: PROJECT_AGENT_ROLE_SLUG },
		});
	}

	/**
	 * Gives the account the `project:agent` role in a team project. A personal
	 * project has no members, so the account does not join it. Returns `false`
	 * when the project is not a team project. Joining twice changes nothing.
	 */
	async joinProjectAsAgent(
		id: string,
		projectId: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		return await this.table.runInTransaction(ctx, async (tx) => {
			const isTeamProject = await tx.existsBy(Project, { id: projectId, type: 'team' });
			if (!isTeamProject) return false;
			const alreadyMember = await tx.existsBy(ProjectRelation, { projectId, userId: id });
			if (alreadyMember) return true;
			await tx.save(
				tx.create(ProjectRelation, {
					projectId,
					userId: id,
					role: { slug: PROJECT_AGENT_ROLE_SLUG },
				}),
			);
			return true;
		});
	}

	/**
	 * Creates the `user` row and the details row in one transaction. If one
	 * insert fails, neither row is saved. The name must not be blank.
	 */
	async create({ name, role }: NewServiceAccount, ctx: OperationContext = {}) {
		if (name.trim() === '') {
			throw new UnexpectedError('A service account needs a name');
		}

		return await this.table.runInTransaction(ctx, async (tx) => {
			const serviceAccount = await tx.save(tx.create(ServiceAccount, { role }));
			serviceAccount.details = await tx.save(
				tx.create(ServiceAccountDetails, { userId: serviceAccount.id, name }),
			);
			return serviceAccount;
		});
	}

	/**
	 * Creates the account, its details, its personal project and the owner
	 * relation in one transaction. The project takes the account name, because a
	 * service account has no email.
	 */
	async createWithPersonalProject(account: NewServiceAccount, ctx: OperationContext = {}) {
		return await this.table.runInTransaction(ctx, async (tx, txCtx) => {
			const serviceAccount = await this.create(account, txCtx);
			const project = await tx.save(
				tx.create(Project, {
					type: 'personal',
					name: account.name,
					creatorId: serviceAccount.id,
				}),
			);
			await tx.save(
				tx.create(ProjectRelation, {
					projectId: project.id,
					userId: serviceAccount.id,
					role: { slug: PROJECT_OWNER_ROLE_SLUG },
				}),
			);
			return { serviceAccount, project };
		});
	}

	/**
	 * Renames the account and its personal project in one transaction, because
	 * the project takes the account name. The name must not be blank.
	 */
	async rename(id: string, name: string, ctx: OperationContext = {}) {
		if (name.trim() === '') {
			throw new UnexpectedError('A service account needs a name');
		}

		await this.table.runInTransaction(ctx, async (tx) => {
			await tx.update(ServiceAccountDetails, { userId: id }, { name });
			await tx.update(Project, { type: 'personal', creatorId: id }, { name });
		});
	}
}
