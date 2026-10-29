import type { RoleChangeRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { PublicUser } from '@n8n/db';
import { User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { getGlobalScopes, type AssignableGlobalRole } from '@n8n/permissions';
import type { IUserSettings } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import type { Invitation } from '@/interfaces';
import type { PostHogClient } from '@/posthog';
import type { UserRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import { UserManagementMailer } from '@/user-management/email';

import { PublicApiKeyService } from './public-api-key.service';
import { RoleService } from './role.service';
import { GlobalConfig } from '@n8n/config';
import { JwtService } from './jwt.service';

@Service()
export class UserService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly mailer: UserManagementMailer,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
		private readonly publicApiKeyService: PublicApiKeyService,
		private readonly roleService: RoleService,
		private readonly globalConfig: GlobalConfig,
		private readonly jwtService: JwtService,
	) {}

	async update(userId: string, data: Partial<User>) {
		const user = await this.userRepository.findOneBy({ id: userId });

		if (user) {
			await this.userRepository.save({ ...user, ...data }, { transaction: true });
		}

		return;
	}

	getManager() {
		return this.userRepository.manager;
	}

	async updateSettings(userId: string, newSettings: Partial<IUserSettings>) {
		const user = await this.userRepository.findOneOrFail({ where: { id: userId } });

		if (user.settings) {
			Object.assign(user.settings, newSettings);
		} else {
			user.settings = newSettings;
		}

		await this.userRepository.save(user);
	}

	async toPublic(
		user: User,
		options?: {
			posthog?: PostHogClient;
			withScopes?: boolean;
			mfaAuthenticated?: boolean;
		},
	) {
		const { password, updatedAt, authIdentities, mfaRecoveryCodes, mfaSecret, role, ...rest } =
			user;

		const providerType = authIdentities?.[0]?.providerType;

		let publicUser: PublicUser = {
			...rest,
			role: role?.slug,
			signInType: providerType ?? 'email',
			isOwner: user.role.slug === 'global:owner',
		};

		if (options?.posthog) {
			publicUser = await this.addFeatureFlags(publicUser, options.posthog);
		}

		// TODO: resolve these directly in the frontend
		if (options?.withScopes) {
			publicUser.globalScopes = getGlobalScopes(user);
		}

		publicUser.mfaAuthenticated = options?.mfaAuthenticated ?? false;

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

	private async sendEmails(
		owner: User,
		toInviteUsers: { [key: string]: string },
		role: AssignableGlobalRole,
	) {
		const domain = this.urlService.getInstanceBaseUrl();

		const inviteLinksEmailOnly = this.globalConfig.userManagement.inviteLinksEmailOnly;

		return await Promise.all(
			Object.entries(toInviteUsers).map(async ([email, id]) => {
				const token = this.jwtService.sign(
					{
						inviterId: owner.id,
						inviteeId: id,
					},
					{
						expiresIn: '90d',
					},
				);
				const inviteAcceptUrl = `${domain}/signup?token=${token}`;
				const invitedUser: UserRequest.InviteResponse = {
					user: {
						id,
						email,
						emailSent: false,
						role,
					},
					error: '',
				};

				try {
					const result = await this.mailer.invite({
						email,
						inviteAcceptUrl,
					});
					if (result.emailSent) {
						invitedUser.user.emailSent = true;

						this.eventService.emit('user-transactional-email-sent', {
							userId: id,
							messageType: 'New user invite',
							publicApi: false,
						});
					}

					// Only include the invite URL in the response if
					// the users configuration allows it
					// and the email was not sent (to allow manual copy-paste)
					if (!inviteLinksEmailOnly && !result.emailSent) {
						invitedUser.user.inviteAcceptUrl = inviteAcceptUrl;
					}

					this.eventService.emit('user-invited', {
						user: owner,
						targetUserId: Object.values(toInviteUsers),
						publicApi: false,
						emailSent: result.emailSent,
						inviteeRole: role, // same role for all invited users
					});
				} catch (e) {
					if (e instanceof Error) {
						this.eventService.emit('email-failed', {
							user: owner,
							messageType: 'New user invite',
							publicApi: false,
						});
						// Do not log inviteAcceptUrl: it contains a live JWT that must not appear in logs
						this.logger.error('Failed to send email', {
							userId: owner.id,
							email,
						});
						invitedUser.error = e.message;
					}
				}

				return invitedUser;
			}),
		);
	}

	async inviteUsers(owner: User, invitations: Invitation[]) {
		const emails = invitations.map(({ email }) => email);

		const existingUsers = await this.userRepository.findManyByEmail(emails);

		const existUsersEmails = existingUsers.map((user) => user.email);

		const toCreateUsers = invitations.filter(({ email }) => !existUsersEmails.includes(email));

		const pendingUsersToInvite = existingUsers.filter((email) => email.isPending);

		const createdUsers = new Map<string, string>();

		this.logger.debug(
			toCreateUsers.length > 1
				? `Creating ${toCreateUsers.length} user shells...`
				: 'Creating 1 user shell...',
		);

		// Check that all roles in the invitations exist in the database
		await this.roleService.checkRolesExist(
			invitations.map(({ role }) => role),
			'global',
		);

		try {
			await this.getManager().transaction(
				async (transactionManager) =>
					await Promise.all(
						toCreateUsers.map(async ({ email, role }) => {
							const { user: savedUser } = await this.userRepository.createUserWithProject(
								{
									email,
									role: {
										slug: role,
									},
								},
								transactionManager,
							);
							createdUsers.set(email, savedUser.id);
							return savedUser;
						}),
					),
			);
		} catch (error) {
			this.logger.error('Failed to create user shells', { userShells: createdUsers });
			throw new InternalServerError('An error occurred during user creation', error);
		}

		pendingUsersToInvite.forEach(({ email, id }) => createdUsers.set(email, id));

		const usersInvited = await this.sendEmails(
			owner,
			Object.fromEntries(createdUsers),
			invitations[0].role, // same role for all invited users
		);

		return { usersInvited, usersCreated: toCreateUsers.map(({ email }) => email) };
	}

	async changeUserRole(user: User, newRole: RoleChangeRequestDto) {
		// Check that new role exists
		await this.roleService.checkRolesExist([newRole.newRoleName], 'global');

		return await this.userRepository.manager.transaction(async (trx) => {
			await trx.update(User, { id: user.id }, { role: { slug: newRole.newRoleName } });

			const adminDowngradedToMember =
				user.role.slug === 'global:admin' && newRole.newRoleName === 'global:member';

			if (adminDowngradedToMember) {
				await this.publicApiKeyService.removeOwnerOnlyScopesFromApiKeys(user, trx);
			}
		});
	}

	getInvitationIdsFromToken(token: string): { inviterId: string; inviteeId: string } {
		let decoded: { inviterId?: string; inviteeId?: string };

		try {
			decoded = this.jwtService.verify<{ inviterId?: string; inviteeId?: string }>(token);
		} catch (error) {
			this.logger.debug('Failed to verify invite token', { error });
			throw new BadRequestError('Invalid invite URL');
		}

		if (!decoded.inviterId || !decoded.inviteeId) {
			this.logger.debug('Invite token is missing inviterId or inviteeId');
			throw new BadRequestError('Invalid invite URL');
		}

		return { inviterId: decoded.inviterId, inviteeId: decoded.inviteeId };
	}
}
