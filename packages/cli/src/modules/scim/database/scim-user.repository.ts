import {
	AuthIdentity,
	BaseRepository,
	Person,
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
 * a filtered page in SCIM's ordering, and creating a provisioned user together
 * with the identity that links them to the IdP.
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

	/**
	 * One page of people in a stable order, optionally narrowed by a SCIM filter.
	 * SCIM manages people only, so service accounts never appear.
	 */
	async findPage(
		{ skip, take, filter }: { skip: number; take: number; filter?: ScimUserFilter },
		ctx: OperationContext,
	): Promise<[Person[], number]> {
		const qb = this.managerFor(ctx)
			.createQueryBuilder(Person, 'user')
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
		const people = take > 0 ? await qb.skip(skip).take(take).getMany() : [];

		return [people, total];
	}

	/**
	 * Create the user, their personal project and the identity that links them
	 * to the IdP as one unit, so a provisioned user is never left without the
	 * identity that lets them sign in.
	 */
	async createProvisioned(
		user: DeepPartial<User>,
		identity: { providerId: string; providerType: AuthProviderType } | undefined,
		ctx: OperationContext,
	): Promise<User> {
		return await this.runInTransaction(ctx, async (tx) => {
			const { user: created } = await this.userRepository.createUserWithProject(user, tx);

			if (identity) {
				await tx.save(tx.create(AuthIdentity, { ...identity, userId: created.id }));
			}

			return created;
		});
	}
}
