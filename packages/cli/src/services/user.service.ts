import type { RoleChangeRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { PublicUser } from '@n8n/db';
import {
	ProjectRelation,
	User,
	UserRepository,
	ProjectRepository,
	Not,
	In,
	GLOBAL_OWNER_ROLE,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	getGlobalScopes,
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
	type AssignableGlobalRole,
} from '@n8n/permissions';
import type { IUserSettings } from 'n8n-workflow';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import type { Invitation } from '@/interfaces';
import { PostHogClient } from '@/posthog';
import type { UserRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import { UserManagementMailer } from '@/user-management/email';

import { PublicApiKeyService } from './public-api-key.service';
import { RoleService } from './role.service';
import { JwtService } from './jwt.service';

const TAMPER_PROOF_INVITE_LINKS_EXPERIMENT = '061_tamper_proof_invite_links';

@Service()
export class UserService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly mailer: UserManagementMailer,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
		private readonly publicApiKeyService: PublicApiKeyService,
		private readonly roleService: RoleService,
		private readonly globalConfig: GlobalConfig,
		private readonly jwtService: JwtService,
		private readonly postHog: PostHogClient,
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
			withInviteUrl?: boolean;
			inviterId?: string;
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

		if (options?.withInviteUrl && !options?.inviterId) {
			throw new UnexpectedError('Inviter ID is required to generate invite URL');
		}

		const inviteLinksEmailOnly = this.globalConfig.userManagement.inviteLinksEmailOnly;

		if (
			!inviteLinksEmailOnly &&
			options?.withInviteUrl &&
			options?.inviterId &&
			publicUser.isPending
		) {
			publicUser = this.addInviteUrl(options.inviterId, publicUser);
		}

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

	private addInviteUrl(inviterId: string, invitee: PublicUser) {
		const url = new URL(this.urlService.getInstanceBaseUrl());
		url.pathname = '/signup';
		url.searchParams.set('inviterId', inviterId);
		url.searchParams.set('inviteeId', invitee.id);

		invitee.inviteAcceptUrl = url.toString();

		return invitee;
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

		// Check if tamper-proof invite links feature flag is enabled for the owner
		let useTamperProofLinks = false;
		try {
			const featureFlags = await this.postHog.getFeatureFlags({
				id: owner.id,
				createdAt: owner.createdAt,
			});
			useTamperProofLinks = featureFlags[TAMPER_PROOF_INVITE_LINKS_EXPERIMENT] === true;
		} catch (error) {
			// If feature flag check fails, fall back to old mechanism
			this.logger.debug('Failed to check feature flags for tamper-proof invite links', { error });
		}

		return await Promise.all(
			Object.entries(toInviteUsers).map(async ([email, id]) => {
				let inviteAcceptUrl: string;
				if (useTamperProofLinks) {
					// Use JWT-based tamper-proof invite links when feature flag is enabled
					const token = this.jwtService.sign(
						{
							inviterId: owner.id,
							inviteeId: id,
						},
						{
							expiresIn: '90d',
						},
					);
					inviteAcceptUrl = `${domain}/signup?token=${token}`;
				} else {
					// Use legacy invite links when feature flag is disabled
					inviteAcceptUrl = `${domain}/signup?inviterId=${owner.id}&inviteeId=${id}`;
				}
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
						this.logger.error('Failed to send email', {
							userId: owner.id,
							inviteAcceptUrl,
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

			const isAdminRole = (roleName: string) => {
				return roleName === 'global:admin' || roleName === 'global:owner';
			};

			const isDowngradedToChatUser =
				user.role.slug !== 'global:chatUser' && newRole.newRoleName === 'global:chatUser';
			const isUpgradedChatUser =
				user.role.slug === 'global:chatUser' && newRole.newRoleName !== 'global:chatUser';
			const isDowngradedAdmin = isAdminRole(user.role.slug) && !isAdminRole(newRole.newRoleName);

			if (isDowngradedToChatUser) {
				// Revoke user's project roles in any shared projects they have access to.
				const projectRelations = await trx.find(ProjectRelation, {
					where: { userId: user.id, role: { slug: Not(PROJECT_OWNER_ROLE_SLUG) } },
					relations: ['role'],
				});
				for (const relation of projectRelations) {
					if (relation.role.slug === PROJECT_ADMIN_ROLE_SLUG) {
						// Ensure there is at least one other admin in the project
						const adminCount = await trx.count(ProjectRelation, {
							where: {
								projectId: relation.projectId,
								role: { slug: In([PROJECT_ADMIN_ROLE_SLUG, PROJECT_OWNER_ROLE_SLUG]) },
								userId: Not(user.id),
							},
						});
						if (adminCount === 0) {
							throw new UserError(
								`Cannot downgrade user as they are the only project admin in project "${relation.projectId}".`,
							);
						}
					}

					await trx.delete(ProjectRelation, {
						userId: user.id,
						projectId: relation.projectId,
					});
				}

				const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(
					user.id,
					trx,
				);

				// Revoke 'project:personalOwner' role on their personal project
				// and grant 'project:viewer' role instead.
				await trx.update(
					ProjectRelation,
					{
						userId: user.id,
						role: { slug: PROJECT_OWNER_ROLE_SLUG },
						projectId: personalProject.id,
					},
					{ role: { slug: PROJECT_VIEWER_ROLE_SLUG } },
				);

				// Revoke all API keys from chat users
				await this.publicApiKeyService.deleteAllApiKeysForUser(user, trx);
			} else if (isDowngradedAdmin) {
				await this.publicApiKeyService.removeOwnerOnlyScopesFromApiKeys(user, trx);
			} else if (isUpgradedChatUser) {
				const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(
					user.id,
					trx,
				);

				// Revoke previous 'project:viewer' role on their personal project
				// and grant 'project:personalOwner' role instead.
				await trx.update(
					ProjectRelation,
					{
						userId: user.id,
						role: { slug: PROJECT_VIEWER_ROLE_SLUG },
						projectId: personalProject.id,
					},
					{ role: { slug: PROJECT_OWNER_ROLE_SLUG } },
				);
			}
		});
	}

	/**
	 * Extract inviterId and inviteeId from either JWT token or legacy query parameters
	 * Validates the format based on the feature flag for the inviter
	 * @param payload - ResolveSignupTokenQueryDto containing either token or inviterId/inviteeId
	 * @returns Object with inviterId and inviteeId
	 * @throws BadRequestError if format doesn't match feature flag, JWT is invalid, or required parameters are missing
	 */
	private async processTokenBasedInvite(
		token: string,
	): Promise<{ inviterId: string; inviteeId: string }> {
		try {
			const decoded = this.jwtService.verify<{ inviterId: string; inviteeId: string }>(token);
			if (!decoded.inviterId || !decoded.inviteeId) {
				this.logger.debug('Invalid JWT token payload - missing inviterId or inviteeId');
				throw new BadRequestError('Invalid invite URL');
			}

			return { inviterId: decoded.inviterId, inviteeId: decoded.inviteeId };
		} catch (error) {
			if (error instanceof BadRequestError) {
				throw error;
			}
			this.logger.debug('Failed to verify JWT token', { error });
			throw new BadRequestError('Invalid invite URL');
		}
	}

	private async processInviteeIdInviterIdBasedInvite(
		inviterId: string,
		inviteeId: string,
	): Promise<{ inviterId: string; inviteeId: string }> {
		return { inviterId, inviteeId };
	}

	async getInvitationIdsFromPayload(payload: {
		token?: string;
		inviterId?: string;
		inviteeId?: string;
	}): Promise<{ inviterId: string; inviteeId: string }> {
		if (payload.token && (payload.inviteeId || payload.inviterId)) {
			this.logger.error('Invalid invite url containing both token and inviterId / inviteeId');
			throw new BadRequestError('Invalid invite URL');
		}

		const instanceOwner = await this.userRepository.findOne({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
		});

		if (!instanceOwner) {
			throw new BadRequestError('Instance owner not found');
		}

		let isTamperProofLinksEnabled = false;
		try {
			const featureFlags = await this.postHog.getFeatureFlags({
				id: instanceOwner.id,
				createdAt: instanceOwner.createdAt,
			});
			isTamperProofLinksEnabled = featureFlags[TAMPER_PROOF_INVITE_LINKS_EXPERIMENT] === true;
		} catch (error) {
			this.logger.debug('Failed to check feature flags for tamper-proof invite links', { error });
		}

		if (isTamperProofLinksEnabled && payload.token) {
			return await this.processTokenBasedInvite(payload.token);
		}

		if (payload.inviterId && payload.inviteeId) {
			return await this.processInviteeIdInviterIdBasedInvite(payload.inviterId, payload.inviteeId);
		}

		throw new BadRequestError('Invalid invite URL');
	}
}
