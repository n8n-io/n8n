import { Service } from 'typedi';
import type {
	EntityManager,
	FindManyOptions,
	FindOneOptions,
	FindOptionsWhere,
} from '@n8n/typeorm';
import { In } from '@n8n/typeorm';
import { User } from '@db/entities/User';
import type { IUserSettings } from 'n8n-workflow';
import { UserRepository } from '@/databases/repositories';
import { getInstanceBaseUrl } from '@/UserManagement/UserManagementHelper';
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

	generatePasswordResetUrl(instanceBaseUrl: string, token: string, mfaEnabled: boolean) {
		const url = new URL(`${instanceBaseUrl}/change-password`);

		url.searchParams.append('token', token);
		url.searchParams.append('mfaEnabled', mfaEnabled.toString());

		return url.toString();
	}

	async toPublic(user: User, options?: { withInviteUrl?: boolean; posthog?: PostHogClient }) {
		const { password, updatedAt, apiKey, authIdentities, ...rest } = user;

		const ldapIdentity = authIdentities?.find((i) => i.providerType === 'ldap');

		let publicUser: PublicUser = {
			...rest,
			signInType: ldapIdentity ? 'ldap' : 'email',
			hasRecoveryCodesLeft: !!user.mfaRecoveryCodes?.length,
		};

		if (options?.withInviteUrl && publicUser.isPending) {
			publicUser = this.addInviteUrl(publicUser, user.id);
		}

		if (options?.posthog) {
			publicUser = await this.addFeatureFlags(publicUser, options.posthog);
		}

		return publicUser;
	}

	private addInviteUrl(user: PublicUser, inviterId: string) {
		const url = new URL(getInstanceBaseUrl());
		url.pathname = '/signup';
		url.searchParams.set('inviterId', inviterId);
		url.searchParams.set('inviteeId', user.id);

		user.inviteAcceptUrl = url.toString();

		return user;
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
