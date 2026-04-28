import type { RoleChangeRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AuthIdentity, PublicUser } from '@n8n/db';
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
import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import type { Invitation } from '@/interfaces';
import { PostHogClient } from '@/posthog';
import type { UserRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import { UserManagementMailer } from '@/user-management/email';

import { JwtService } from './jwt.service';
import { OwnershipService } from './ownership.service';
import { ProjectService } from './project.service.ee';
import { PublicApiKeyService } from './public-api-key.service';
import { RoleService } from './role.service';

@Service()
export class UserService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly mailer: UserManagementMailer,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
		private readonly ownershipService: OwnershipService,
		private readonly publicApiKeyService: PublicApiKeyService,
		private readonly roleService: RoleService,
		private readonly globalConfig: GlobalConfig,
		private readonly jwtService: JwtService,
		private readonly projectService: ProjectService,
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

	async assertGetUsersAccess(user: User, projectId?: string): Promise<void> {
		if (projectId) {
			const project = await this.projectService.getProjectWithScope(user, projectId, [
				'project:list',
			]);
			if (!project) {
				throw new NotFoundError('Project not found');
			}
			return;
		}
		const isInstanceAdmin = ['global:owner', 'global:admin'].includes(user.role.slug);
		if (isInstanceAdmin) {
			return;
		}
		const hasProjectUpdateScope =
			(await this.projectService.getProjectIdsWithScope(user, ['project:update'])).length > 0;
		if (!hasProjectUpdateScope) {
			throw new ForbiddenError(
				'Listing all users is limited to instance administrators and project admins. Filter by project to list project members.',
			);
		}
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

	async findUserWithAuthIdentities(userId: string): Promise<User> {
		return await this.userRepository.findOneOrFail({
			where: { id: userId },
			relations: ['role', 'authIdentities'],
		});
	}

	/**
	 * Check if a user is authenticated via LDAP or OIDC.
	 * These users should not be able to change their profile information.
	 */
	async findSsoIdentity(userId: string): Promise<AuthIdentity | undefined> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['authIdentities'],
		});

		const ssoIdentity = user?.authIdentities?.find((identity) => identity.providerType !== 'email');

		return ssoIdentity;
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

		const { instanceSettingsLoader } = this.globalConfig;
		if (
			instanceSettingsLoader.ownerManagedByEnv &&
			!!user.email &&
			user.email.toLowerCase() === instanceSettingsLoader.ownerEmail.toLowerCase()
		) {
			publicUser.isManagedByEnv = true;
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

	private async sendEmails(
		owner: User,
		toInviteUsers: { [key: string]: string },
		role: AssignableGlobalRole,
	) {
		const domain = this.urlService.getInstanceBaseUrl();

		const inviteLinksEmailOnly = this.globalConfig.userManagement.inviteLinksEmailOnly;

		return await Promise.all(
			Object.entries(toInviteUsers).map(async ([email, id]) => {
				// Always use JWT-based tamper-proof invite links
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

		await this.userRepository.manager.transaction(async (trx) => {
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

		// Invalidate ownership cache for the user to ensure their new permissions are reflected in subsequent requests
		await this.ownershipService.invalidateProjectOwnerCacheByUserId(user.id);
	}

	/**
	 * Extract inviterId and inviteeId from JWT token
	 * @param token - JWT token containing inviterId and inviteeId
	 * @returns Object with inviterId and inviteeId
	 * @throws BadRequestError if JWT is invalid or required parameters are missing
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

	/**
	 * Extract inviterId and inviteeId from JWT token
	 * @param token - JWT token containing inviterId and inviteeId
	 * @returns Object with inviterId and inviteeId
	 * @throws BadRequestError if JWT is invalid or required parameters are missing
	 */
	async getInvitationIdsFromPayload(
		token: string,
	): Promise<{ inviterId: string; inviteeId: string }> {
		const instanceOwner = await this.userRepository.findOne({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
		});

		if (!instanceOwner) {
			throw new BadRequestError('Instance owner not found');
		}

		// Only support token-based invites (tamper-proof)
		return await this.processTokenBasedInvite(token);
	}
}
