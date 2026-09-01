import type { RoleChangeRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { PublicUser } from '@n8n/db';
import {
	AuthIdentity,
	Project,
	ProjectRelation,
	User,
	UserRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	Not,
	In,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_OWNER_ROLE,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import {
	getGlobalScopes,
	isBuiltInRole,
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
	type AssignableGlobalRole,
} from '@n8n/permissions';
import type { IUserSettings } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { validate as uuidValidate } from 'uuid';

import { JwtService } from './jwt.service';
import { OwnershipService } from './ownership.service';
import { ProjectService } from './project.service.ee';
import { PublicApiKeyService } from './public-api-key.service';
import { RoleService } from './role.service';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import type { Invitation } from '@/interfaces';
import { License } from '@/license';
import { PostHogClient } from '@/posthog';
import type { UserRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import { isSsoCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { UserManagementMailer } from '@/user-management/email';

export const CHANGE_ROLE_ERROR_MESSAGES = {
	NO_USER: 'Target user not found',
	NO_ADMIN_ON_OWNER: 'Admin cannot change role on global owner',
	NO_OWNER_ON_OWNER: 'Owner cannot change role on global owner',
	CANNOT_CHANGE_OWN_ROLE: 'Cannot change your own global role',
	INSTANCE_ROLES_MANAGED: 'Instance roles are managed automatically and cannot be changed manually',
} as const;

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
		private readonly license: License,
		private readonly externalHooks: ExternalHooks,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
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

		// Only custom roles are license-gated here; built-in roles are assignable on every
		// entry point (SSO/SCIM provisioning, token exchange, REST). The REST endpoint
		// separately gates advanced permissions for built-in admin.
		if (
			!isBuiltInRole(newRole.newRoleName) &&
			!this.roleService.isRoleLicensed(newRole.newRoleName)
		) {
			throw new ForbiddenError(
				`The role "${newRole.newRoleName}" is not available in your current license.`,
			);
		}

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

	async getUser(withIdentifier: string): Promise<User | null> {
		return uuidValidate(withIdentifier)
			? await this.userRepository.findByIdWithRole(withIdentifier)
			: await this.userRepository.findByEmailWithRole(withIdentifier);
	}

	async getUsersAndCount(options: {
		ids?: string[];
		limit?: number;
		offset?: number;
	}): Promise<{ users: User[]; count: number }> {
		const listOptions = { includeRole: true, offset: options.offset, limit: options.limit };
		const users = options.ids
			? await this.userRepository.findManyByIds(options.ids, listOptions)
			: await this.userRepository.findMany(listOptions);
		const count = await this.userRepository.count();

		return { users, count };
	}

	async inviteUser(inviter: User, invitations: Invitation[]) {
		if (invitations.length === 0) return [];

		if (isSsoCurrentAuthenticationMethod()) {
			this.logger.debug(
				'SSO is enabled, so users are managed by the Identity Provider and cannot be added through invites',
			);
			throw new BadRequestError(
				'SSO is enabled, so users are managed by the Identity Provider and cannot be added through invites',
			);
		}

		if (!this.license.isWithinUsersLimit()) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because the user limit quota has been reached',
			);
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		if (!(await this.ownershipService.hasInstanceOwner())) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because the owner account is not set up',
			);
			throw new BadRequestError('You must set up your own account before inviting others');
		}

		const attributes = invitations.map(({ email, role }) => {
			if (role === 'global:admin' && !this.license.isAdvancedPermissionsLicensed()) {
				throw new ForbiddenError(
					'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
				);
			}
			return { email, role };
		});

		const { usersInvited, usersCreated } = await this.inviteUsers(inviter, attributes);

		await this.externalHooks.run('user.invited', [usersCreated]);

		return usersInvited;
	}

	async deleteUser(actor: User, idToDelete: string, transferId?: string) {
		if (actor.id === idToDelete) {
			this.logger.debug(
				'Request to delete a user failed because it attempted to delete the requesting user',
				{ userId: actor.id },
			);
			throw new BadRequestError('Cannot delete your own user');
		}

		const userToDelete = await this.userRepository.findByIdWithRole(idToDelete);

		if (!userToDelete) {
			throw new NotFoundError(
				'Request to delete a user failed because the user to delete was not found in DB',
			);
		}

		if (userToDelete.role.slug === GLOBAL_OWNER_ROLE.slug) {
			throw new ForbiddenError('Instance owner cannot be deleted.');
		}

		const personalProjectToDelete = await this.projectRepository.getPersonalProjectForUserOrFail(
			userToDelete.id,
		);

		if (transferId === personalProjectToDelete.id) {
			throw new BadRequestError(
				'Request to delete a user failed because the user to delete and the transferee are the same user',
			);
		}

		let transfereeId;
		let transfereeProject: Project | null = null;

		if (transferId) {
			transfereeProject = await this.projectService.findProject(transferId);

			if (!transfereeProject) {
				throw new NotFoundError(
					'Request to delete a user failed because the transferee project was not found in DB',
				);
			}

			const transferee = await this.userRepository.findOneByProjectIdOrFail(transfereeProject.id);

			transfereeId = transferee.id;

			const ownershipTransferService = await this.getOwnershipTransferService();
			await ownershipTransferService.transferAllResources(
				[personalProjectToDelete.id],
				transfereeProject.id,
			);
		}

		const [ownedSharedWorkflows, ownedSharedCredentials] = await Promise.all([
			this.sharedWorkflowRepository.find({
				select: { workflowId: true },
				where: { projectId: personalProjectToDelete.id, role: 'workflow:owner' },
			}),
			this.sharedCredentialsRepository.find({
				relations: { credentials: true },
				where: { projectId: personalProjectToDelete.id, role: 'credential:owner' },
			}),
		]);

		const ownedCredentials = ownedSharedCredentials.map(({ credentials }) => credentials);

		const workflowService = await this.getWorkflowService();
		for (const { workflowId } of ownedSharedWorkflows) {
			await workflowService.delete(userToDelete, workflowId, true);
		}

		const credentialsService = await this.getCredentialsService();
		for (const credential of ownedCredentials) {
			await credentialsService.delete(userToDelete, credential.id);
		}

		// Clean up module-owned resources (e.g. data tables with their physical
		// user tables) before the project is removed, so they are not orphaned by
		// the FK cascade. The transfer case is handled by the transfer above.
		if (!transfereeProject) {
			const ownershipTransferService = await this.getOwnershipTransferService();
			await ownershipTransferService.deleteModuleOwnedResources([personalProjectToDelete.id]);
		}

		await this.getManager().transaction(async (trx) => {
			await trx.delete(AuthIdentity, { userId: userToDelete.id });
			await trx.delete(Project, { id: personalProjectToDelete.id });
			await trx.delete(User, { id: userToDelete.id });
		});

		this.eventService.emit('user-deleted', {
			user: actor,
			publicApi: false,
			targetUserOldStatus: userToDelete.isPending ? 'invited' : 'active',
			targetUserId: idToDelete,
			migrationStrategy: transferId ? 'transfer_data' : 'delete_data',
			migrationUserId: transfereeId,
		});

		await this.externalHooks.run('user.deleted', [await this.toPublic(userToDelete)]);

		return { success: true };
	}

	async changeGlobalRole(actor: User, id: string, payload: RoleChangeRequestDto) {
		const provisioningService = await this.getProvisioningService();

		if (await provisioningService.isInstanceRoleManaged()) {
			throw new ForbiddenError(CHANGE_ROLE_ERROR_MESSAGES.INSTANCE_ROLES_MANAGED);
		}

		if (actor.id === id) {
			throw new ForbiddenError(CHANGE_ROLE_ERROR_MESSAGES.CANNOT_CHANGE_OWN_ROLE);
		}

		const targetUser = await this.userRepository.findByIdWithRole(id);
		if (targetUser === null) {
			throw new NotFoundError(CHANGE_ROLE_ERROR_MESSAGES.NO_USER);
		}

		if (
			actor.role.slug === GLOBAL_ADMIN_ROLE.slug &&
			targetUser.role.slug === GLOBAL_OWNER_ROLE.slug
		) {
			throw new ForbiddenError(CHANGE_ROLE_ERROR_MESSAGES.NO_ADMIN_ON_OWNER);
		}

		if (
			actor.role.slug === GLOBAL_OWNER_ROLE.slug &&
			targetUser.role.slug === GLOBAL_OWNER_ROLE.slug
		) {
			throw new ForbiddenError(CHANGE_ROLE_ERROR_MESSAGES.NO_OWNER_ON_OWNER);
		}

		await this.changeUserRole(targetUser, payload);

		this.eventService.emit('user-changed-role', {
			userId: actor.id,
			targetUserId: targetUser.id,
			targetUserNewRole: payload.newRoleName,
			publicApi: false,
		});

		return { success: true };
	}

	/** Lazy: these services import `UserService`, so a static import would be a value-import cycle. */
	private async getProvisioningService() {
		const { ProvisioningService } = await import(
			'@/modules/provisioning.ee/provisioning.service.ee.js'
		);

		return Container.get(ProvisioningService);
	}

	private async getWorkflowService() {
		const { WorkflowService } = await import('@/workflows/workflow.service.js');
		return Container.get(WorkflowService);
	}

	private async getCredentialsService() {
		const { CredentialsService } = await import('@/credentials/credentials.service.js');
		return Container.get(CredentialsService);
	}

	private async getOwnershipTransferService() {
		const { OwnershipTransferService } = await import(
			'@/services/ownership-transfer/ownership-transfer.service.js'
		);
		return Container.get(OwnershipTransferService);
	}
}
