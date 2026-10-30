import {
	BaseRepository,
	OperationContext,
	ProjectRelation,
	Role,
	TransactionRunner,
	User,
	UserRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type DeepPartial, In } from '@n8n/typeorm';

import {
	TrustedSourceIdentityEntity,
	type TrustedSourceIdentityStatus,
} from '../entities/trusted-source-identity.entity';

class TrustedSourceIdentityStore extends BaseRepository<TrustedSourceIdentityEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TrustedSourceIdentityEntity, dataSource.manager, transactionRunner);
	}
}

export type InsertTrustedSourceIdentityRow = Pick<
	TrustedSourceIdentityEntity,
	'sourceId' | 'subject' | 'userId' | 'provenance' | 'status'
>;

@Service()
export class TrustedSourceIdentityRepository {
	private readonly store: TrustedSourceIdentityStore;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly users: UserRepository,
	) {
		this.store = new TrustedSourceIdentityStore(dataSource, transactionRunner);
	}

	/** Reads the database on every call: an offboarding must take effect on the next resolve. */
	async findBinding(
		sourceId: string,
		subject: string,
		ctx: OperationContext,
	): Promise<{ userId: string; status: TrustedSourceIdentityStatus } | null> {
		return await this.store.managerFor(ctx).findOne(TrustedSourceIdentityEntity, {
			select: ['userId', 'status'],
			where: { sourceId, subject },
		});
	}

	async clearByTrustedSourceId(trustedSourceId: string, ctx: OperationContext): Promise<void> {
		await this.store
			.managerFor(ctx)
			.delete(TrustedSourceIdentityEntity, { sourceId: trustedSourceId });
	}

	/** Loads the binding with its user and the user's role, so the caller can build a principal. */
	async findBySubject(
		sourceId: string,
		subject: string,
		ctx: OperationContext,
	): Promise<TrustedSourceIdentityEntity | null> {
		return await this.store.managerFor(ctx).findOne(TrustedSourceIdentityEntity, {
			where: { sourceId, subject },
			relations: {
				user: {
					role: true,
				},
			},
		});
	}

	/** Reads inside the identity transaction must reuse its connection: the pool may hold one. */
	async findUserByEmail(email: string, ctx: OperationContext): Promise<User | null> {
		return await this.store
			.managerFor(ctx)
			.findOne(User, { where: { email }, relations: { role: true } });
	}

	async globalRoleExists(slug: string, ctx: OperationContext): Promise<boolean> {
		return await this.store.managerFor(ctx).exists(Role, { where: { slug, roleType: 'global' } });
	}

	/** True when every slug names a project role. Reads inside the identity transaction. */
	async projectRolesExist(slugs: string[], ctx: OperationContext): Promise<boolean> {
		const unique = [...new Set(slugs)];
		if (unique.length === 0) return true;
		const count = await this.store
			.managerFor(ctx)
			.count(Role, { where: { slug: In(unique), roleType: 'project' } });
		return count === unique.length;
	}

	async touchLastSeen(
		sourceId: string,
		subject: string,
		seenAt: Date,
		ctx: OperationContext,
	): Promise<void> {
		await this.store
			.managerFor(ctx)
			.update(TrustedSourceIdentityEntity, { sourceId, subject }, { lastSeenAt: seenAt });
	}

	/** Writes the binding unless one exists for `(sourceId, subject)`; an existing row wins silently. */
	async insertIfAbsent(row: InsertTrustedSourceIdentityRow, ctx: OperationContext): Promise<void> {
		await this.store
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(TrustedSourceIdentityEntity)
			.values(row)
			.orIgnore()
			.execute();
	}

	/**
	 * Creates the user with its personal project and the binding in one unit of work.
	 * If two concurrent first requests use one new email, the second request fails once on the
	 * unique email index, and this is accepted.
	 */
	async createUserWithBinding(
		ctx: OperationContext,
		user: DeepPartial<User>,
		binding: Pick<InsertTrustedSourceIdentityRow, 'sourceId' | 'subject' | 'provenance' | 'status'>,
		projectRoles: { projectId: string; role: string }[] = [],
	): Promise<User> {
		return await this.store.runInTransaction(ctx, async (tx) => {
			const { user: createdUser } = await this.users.createUserWithProject(user, tx);

			await tx.insert(TrustedSourceIdentityEntity, {
				...binding,
				userId: createdUser.id,
			});

			for (const { projectId, role } of projectRoles) {
				await tx.save(ProjectRelation, {
					userId: createdUser.id,
					projectId,
					role: {
						slug: role,
					},
				});
			}

			return createdUser;
		});
	}
}
