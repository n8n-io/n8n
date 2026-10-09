import { BaseRepository, OperationContext, TransactionRunner, User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type DeepPartial } from '@n8n/typeorm';

import {
	TrustedSourceIdentityEntity,
	type TrustedSourceIdentityStatus,
} from '../entities/trusted-source-identity.entity';

class TrustedSourceIdentityStore extends BaseRepository<TrustedSourceIdentityEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TrustedSourceIdentityEntity, dataSource.manager, transactionRunner);
	}

	override managerFor(ctx: OperationContext) {
		return super.managerFor(ctx);
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
		ctx: OperationContext = {},
	): Promise<{ userId: string; status: TrustedSourceIdentityStatus } | null> {
		return await this.store.managerFor(ctx).findOne(TrustedSourceIdentityEntity, {
			select: ['userId', 'status'],
			where: { sourceId, subject },
		});
	}

	async clearByTrustedSourceId(trustedSourceId: string, ctx: OperationContext = {}): Promise<void> {
		await this.store
			.managerFor(ctx)
			.delete(TrustedSourceIdentityEntity, { sourceId: trustedSourceId });
	}

	/** Loads the binding with its user and the user's role, so the caller can build a principal. */
	async findBySubject(
		sourceId: string,
		subject: string,
		ctx: OperationContext = {},
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

	async touchLastSeen(
		sourceId: string,
		subject: string,
		seenAt: Date,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.store
			.managerFor(ctx)
			.update(TrustedSourceIdentityEntity, { sourceId, subject }, { lastSeenAt: seenAt });
	}

	/** Writes the binding unless one exists for `(sourceId, subject)`; an existing row wins silently. */
	async insertIfAbsent(
		row: InsertTrustedSourceIdentityRow,
		ctx: OperationContext = {},
	): Promise<void> {
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
	): Promise<User> {
		return await this.store.runInTransaction(ctx, async (tx) => {
			const { user: createdUser } = await this.users.createUserWithProject(user, tx);

			await tx.insert(TrustedSourceIdentityEntity, {
				...binding,
				userId: createdUser.id,
			});

			return createdUser;
		});
	}
}
