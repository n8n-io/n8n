import { Service } from 'typedi';
import type { EntityManager, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';
import { User } from '@db/entities/User';
import type { IUserSettings } from 'n8n-workflow';
import { UserRepository } from '@/databases/repositories';
import type { PublicUser } from '@/Interfaces';
import type { PostHogClient } from '@/posthog';

@Service()
export class UserService {
	constructor(private readonly userRepository: UserRepository) {}

	async findOne(options: FindOneOptions<User>) {
		return this.userRepository.findOne({ relations: ['globalRole'], ...options });
	}

	async findOneOrFail(options: FindOneOptions<User>) {
		return this.userRepository.findOneOrFail({ relations: ['globalRole'], ...options });
	}

	async findMany(options: FindManyOptions<User>) {
		return this.userRepository.find(options);
	}

	async findOneBy(options: FindOptionsWhere<User>) {
		return this.userRepository.findOneBy(options);
	}

	create(data: Partial<User>) {
		return this.userRepository.create(data);
	}

	async save(user: Partial<User>) {
		return this.userRepository.save(user);
	}

	async update(userId: string, data: Partial<User>) {
		return this.userRepository.update(userId, data);
	}

	async getByIds(transaction: EntityManager, ids: string[]) {
		return transaction.find(User, { where: { id: In(ids) } });
	}

	getManager() {
		return this.userRepository.manager;
	}

	async updateSettings(userId: string, newSettings: Partial<IUserSettings>) {
		const { settings } = await this.userRepository.findOneOrFail({ where: { id: userId } });

		return this.userRepository.update(userId, { settings: { ...settings, ...newSettings } });
	}

	async toPublic(user: User, options?: { posthog?: PostHogClient }) {
		const { password, updatedAt, apiKey, authIdentities, ...rest } = user;

		const ldapIdentity = authIdentities?.find((i) => i.providerType === 'ldap');

		let publicUser: PublicUser = {
			...rest,
			signInType: ldapIdentity ? 'ldap' : 'email',
			hasRecoveryCodesLeft: !!user.mfaRecoveryCodes?.length,
		};

		if (options?.posthog) {
			publicUser = await this.addFeatureFlags(publicUser, options.posthog);
		}

		return publicUser;
	}

	private async addFeatureFlags(publicUser: PublicUser, posthog: PostHogClient) {
		// native PostHog implementation has default 10s timeout and 3 retries.. which cannot be updated without affecting other functionality
		// https://github.com/PostHog/posthog-js-lite/blob/a182de80a433fb0ffa6859c10fb28084d0f825c2/posthog-core/src/index.ts#L67
		const timeoutPromise = new Promise<PublicUser>((resolve) => {
			setTimeout(() => {
				resolve(publicUser);
			}, 1500);
		});

		const fetchPromise = new Promise<PublicUser>(async (resolve) => {
			publicUser.featureFlags = await posthog.getFeatureFlags(publicUser);
			resolve(publicUser);
		});

		return Promise.race([fetchPromise, timeoutPromise]);
	}
}
