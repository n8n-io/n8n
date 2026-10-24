import {
	AuthIdentity,
	BaseRepository,
	TransactionRunner,
	User,
	UserRepository,
	type AuthProviderType,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type DeepPartial } from '@n8n/typeorm';

export type ScimUserFilter =
	| { attribute: 'userName'; value: string }
	| { attribute: 'externalId'; value: string; providerTypes: AuthProviderType[] };

/**
 * The user queries SCIM needs that the shared `UserRepository` does not cover:
 * a filtered page in SCIM's ordering, creating a provisioned user together
 * with the identity that links them to the IdP, and the SCIM-managed marker.
 */
@Service()
export class ScimUserRepository extends BaseRepository<User> {
	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly userRepository: UserRepository,
	) {
		super(User, dataSource.manager, transactionRunner);
	}

	/** One page of users in a stable order, optionally narrowed by a SCIM filter. */
	async findPage(
		{ skip, take, filter }: { skip: number; take: number; filter?: ScimUserFilter },
		ctx: OperationContext,
	): Promise<[User[], number]> {
		const qb = this.managerFor(ctx)
			.createQueryBuilder(User, 'user')
			.leftJoinAndSelect('user.authIdentities', 'authIdentity')
			.orderBy('user.createdAt', 'ASC')
			.addOrderBy('user.id', 'ASC');

		if (filter?.attribute === 'userName') {
			qb.where('LOWER(user.email) = LOWER(:email)', { email: filter.value });
		} else if (filter?.attribute === 'externalId') {
			qb.where(
				'authIdentity.providerId = :externalId AND authIdentity.providerType IN (:...providerTypes)',
				{ externalId: filter.value, providerTypes: filter.providerTypes },
			);
		}

		const total = await qb.getCount();
		// TypeORM reads `take(0)` as "no limit", but SCIM `count=0` asks for
		// the total only (RFC 7644 section 3.4.2.4).
		const users = take > 0 ? await qb.skip(skip).take(take).getMany() : [];

		return [users, total];
	}

	/**
	 * Create the user, their personal project and the identity that links them
	 * to the IdP as one unit, so a provisioned user is never left without the
	 * identity that lets them sign in. The user is marked as SCIM-managed.
	 */
	async createProvisioned(
		user: DeepPartial<User>,
		identity: { providerId: string; providerType: AuthProviderType } | undefined,
		ctx: OperationContext,
	): Promise<User> {
		return await this.runInTransaction(ctx, async (tx) => {
			const { user: created } = await this.userRepository.createUserWithProject(
				{ ...user, isScimManaged: true },
				tx,
			);

			if (identity) {
				await tx.save(tx.create(AuthIdentity, { ...identity, userId: created.id }));
			}

			return created;
		});
	}

	/**
	 * Mark a user as SCIM-managed, for a user that SCIM did not create. One
	 * update without a read, which changes no user that has the marker.
	 */
	async markManaged(userId: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).update(
			User,
			{ id: userId, isScimManaged: false },
			{ isScimManaged: true },
		);
	}

	/** Number of SCIM-managed users, and how many of them are deactivated. */
	async countProvisioned(
		ctx: OperationContext,
	): Promise<{ provisioned: number; deactivated: number }> {
		const counts = await this.managerFor(ctx)
			.createQueryBuilder(User, 'user')
			.select('COUNT(*)', 'provisioned')
			.addSelect('SUM(CASE WHEN user.disabled = :disabled THEN 1 ELSE 0 END)', 'deactivated')
			.where('user.isScimManaged = :isScimManaged', { isScimManaged: true })
			.setParameter('disabled', true)
			.getRawOne<{ provisioned: number | string; deactivated: number | string | null }>();

		// PostgreSQL returns COUNT and SUM as strings, and SUM of no rows as null.
		return {
			provisioned: Number(counts?.provisioned ?? 0),
			deactivated: Number(counts?.deactivated ?? 0),
		};
	}
}
