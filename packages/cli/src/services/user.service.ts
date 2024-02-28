import { Service } from 'typedi';
import type { IUserSettings } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import { type User } from '@db/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import type { PublicUser } from '@/Interfaces';
import type { PostHogClient } from '@/posthog';
import { InvitationService } from './invitation.service';

@Service()
export class UserService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly invitationService: InvitationService,
	) {}

	async update(userId: string, data: Partial<User>) {
		return await this.userRepository.update(userId, data);
	}

	getManager() {
		return this.userRepository.manager;
	}

	async updateSettings(userId: string, newSettings: Partial<IUserSettings>) {
		const { settings } = await this.userRepository.findOneOrFail({ where: { id: userId } });

		return await this.userRepository.update(userId, { settings: { ...settings, ...newSettings } });
	}

	async toPublic(
		user: User,
		options?: {
			withInviteUrl?: boolean;
			inviterId?: string;
			posthog?: PostHogClient;
			withScopes?: boolean;
		},
	) {
		const { password, updatedAt, apiKey, authIdentities, mfaRecoveryCodes, mfaSecret, ...rest } =
			user;

		const ldapIdentity = authIdentities?.find((i) => i.providerType === 'ldap');

		let publicUser: PublicUser = {
			...rest,
			signInType: ldapIdentity ? 'ldap' : 'email',
			hasRecoveryCodesLeft: !!user.mfaRecoveryCodes?.length,
		};

		if (options?.withInviteUrl && !options?.inviterId) {
			throw new ApplicationError('Inviter ID is required to generate invite URL');
		}

		if (options?.withInviteUrl && options?.inviterId && publicUser.isPending) {
			publicUser.inviteAcceptUrl = this.invitationService.generateInvitationUrl(
				options.inviterId,
				user.id,
			);
		}

		if (options?.posthog) {
			publicUser = await this.addFeatureFlags(publicUser, options.posthog);
		}

		if (options?.withScopes) {
			publicUser.globalScopes = user.globalScopes;
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

		return await Promise.race([fetchPromise, timeoutPromise]);
	}
}
