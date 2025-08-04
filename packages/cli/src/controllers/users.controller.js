'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
var UsersController_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.UsersController = void 0;
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const permissions_1 = require('@n8n/permissions');
const auth_service_1 = require('@/auth/auth.service');
const credentials_service_1 = require('@/credentials/credentials.service');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const folder_service_1 = require('@/services/folder.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const user_analytics_service_1 = require('@/services/user-analytics.service');
const user_service_1 = require('@/services/user.service');
const workflow_service_1 = require('@/workflows/workflow.service');
let UsersController = (UsersController_1 = class UsersController {
	constructor(
		logger,
		externalHooks,
		sharedCredentialsRepository,
		sharedWorkflowRepository,
		userRepository,
		authService,
		userService,
		userAnalyticsService,
		projectRepository,
		workflowService,
		credentialsService,
		projectService,
		eventService,
		folderService,
	) {
		this.logger = logger;
		this.externalHooks = externalHooks;
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.userRepository = userRepository;
		this.authService = authService;
		this.userService = userService;
		this.userAnalyticsService = userAnalyticsService;
		this.projectRepository = projectRepository;
		this.workflowService = workflowService;
		this.credentialsService = credentialsService;
		this.projectService = projectService;
		this.eventService = eventService;
		this.folderService = folderService;
	}
	removeSupplementaryFields(publicUsers, listQueryOptions) {
		const { select } = listQueryOptions;
		if (select !== undefined && !select.includes('id')) {
			for (const user of publicUsers) delete user.id;
		}
		if (select) {
			for (const user of publicUsers) {
				delete user.isOwner;
				delete user.isPending;
				delete user.signInType;
			}
		}
		return publicUsers;
	}
	async listUsers(req, _res, listQueryOptions) {
		const userQuery = this.userRepository.buildUserQuery(listQueryOptions);
		const response = await userQuery.getManyAndCount();
		const [users, count] = response;
		const withInviteUrl = (0, permissions_1.hasGlobalScope)(req.user, 'user:create');
		const publicUsers = await Promise.all(
			users.map(async (u) => {
				const user = await this.userService.toPublic(u, {
					withInviteUrl,
					inviterId: req.user.id,
				});
				return {
					...user,
					projectRelations: u.projectRelations?.map((pr) => ({
						id: pr.projectId,
						role: pr.role,
						name: pr.project.name,
					})),
				};
			}),
		);
		return api_types_1.usersListSchema.parse({
			count,
			items: this.removeSupplementaryFields(publicUsers, listQueryOptions),
		});
	}
	async getUserPasswordResetLink(req) {
		const user = await this.userRepository.findOneOrFail({
			where: { id: req.params.id },
		});
		if (!user) {
			throw new not_found_error_1.NotFoundError('User not found');
		}
		if (req.user.role === 'global:admin' && user.role === 'global:owner') {
			throw new forbidden_error_1.ForbiddenError('Admin cannot reset password of global owner');
		}
		const link = this.authService.generatePasswordResetUrl(user);
		return { link };
	}
	async updateUserSettings(_req, _res, payload, id) {
		await this.userService.updateSettings(id, payload);
		const user = await this.userRepository.findOneOrFail({
			select: ['settings'],
			where: { id },
		});
		return user.settings;
	}
	async deleteUser(req) {
		const { id: idToDelete } = req.params;
		if (req.user.id === idToDelete) {
			this.logger.debug(
				'Request to delete a user failed because it attempted to delete the requesting user',
				{ userId: req.user.id },
			);
			throw new bad_request_error_1.BadRequestError('Cannot delete your own user');
		}
		const { transferId } = req.query;
		const userToDelete = await this.userRepository.findOneBy({ id: idToDelete });
		if (!userToDelete) {
			throw new not_found_error_1.NotFoundError(
				'Request to delete a user failed because the user to delete was not found in DB',
			);
		}
		if (userToDelete.role === 'global:owner') {
			throw new forbidden_error_1.ForbiddenError('Instance owner cannot be deleted.');
		}
		const personalProjectToDelete = await this.projectRepository.getPersonalProjectForUserOrFail(
			userToDelete.id,
		);
		if (transferId === personalProjectToDelete.id) {
			throw new bad_request_error_1.BadRequestError(
				'Request to delete a user failed because the user to delete and the transferee are the same user',
			);
		}
		let transfereeId;
		if (transferId) {
			const transfereeProject = await this.projectRepository.findOneBy({ id: transferId });
			if (!transfereeProject) {
				throw new not_found_error_1.NotFoundError(
					'Request to delete a user failed because the transferee project was not found in DB',
				);
			}
			const transferee = await this.userRepository.findOneByOrFail({
				projectRelations: {
					projectId: transfereeProject.id,
				},
			});
			transfereeId = transferee.id;
			await this.userService.getManager().transaction(async (trx) => {
				await this.workflowService.transferAll(
					personalProjectToDelete.id,
					transfereeProject.id,
					trx,
				);
				await this.credentialsService.transferAll(
					personalProjectToDelete.id,
					transfereeProject.id,
					trx,
				);
				await this.folderService.transferAllFoldersToProject(
					personalProjectToDelete.id,
					transfereeProject.id,
					trx,
				);
			});
			await this.projectService.clearCredentialCanUseExternalSecretsCache(transfereeProject.id);
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
		for (const { workflowId } of ownedSharedWorkflows) {
			await this.workflowService.delete(userToDelete, workflowId, true);
		}
		for (const credential of ownedCredentials) {
			await this.credentialsService.delete(userToDelete, credential.id);
		}
		await this.userService.getManager().transaction(async (trx) => {
			await trx.delete(db_1.AuthIdentity, { userId: userToDelete.id });
			await trx.delete(db_1.Project, { id: personalProjectToDelete.id });
			await trx.delete(db_1.User, { id: userToDelete.id });
		});
		this.eventService.emit('user-deleted', {
			user: req.user,
			publicApi: false,
			targetUserOldStatus: userToDelete.isPending ? 'invited' : 'active',
			targetUserId: idToDelete,
			migrationStrategy: transferId ? 'transfer_data' : 'delete_data',
			migrationUserId: transfereeId,
		});
		await this.externalHooks.run('user.deleted', [await this.userService.toPublic(userToDelete)]);
		return { success: true };
	}
	async changeGlobalRole(req, _, payload, id) {
		const { NO_ADMIN_ON_OWNER, NO_USER, NO_OWNER_ON_OWNER } =
			UsersController_1.ERROR_MESSAGES.CHANGE_ROLE;
		const targetUser = await this.userRepository.findOneBy({ id });
		if (targetUser === null) {
			throw new not_found_error_1.NotFoundError(NO_USER);
		}
		if (req.user.role === 'global:admin' && targetUser.role === 'global:owner') {
			throw new forbidden_error_1.ForbiddenError(NO_ADMIN_ON_OWNER);
		}
		if (req.user.role === 'global:owner' && targetUser.role === 'global:owner') {
			throw new forbidden_error_1.ForbiddenError(NO_OWNER_ON_OWNER);
		}
		await this.userService.changeUserRole(req.user, targetUser, payload);
		this.eventService.emit('user-changed-role', {
			userId: req.user.id,
			targetUserId: targetUser.id,
			targetUserNewRole: payload.newRoleName,
			publicApi: false,
		});
		const projects = await this.projectService.getUserOwnedOrAdminProjects(targetUser.id);
		await Promise.all(
			projects.map(
				async (p) => await this.projectService.clearCredentialCanUseExternalSecretsCache(p.id),
			),
		);
		return { success: true };
	}
	async bulkInviteUsers(req, _, payload) {
		this.logger.debug(`Bulk inviting ${payload.invitations.length} users`, {
			requesterId: req.user.id,
		});
		const result = await this.userService.bulkInviteUsers(req.user, payload);
		return result;
	}
	async bulkUpdateRoles(req, _, payload) {
		this.logger.debug(`Bulk updating roles for ${payload.userRoleUpdates.length} users`, {
			requesterId: req.user.id,
		});
		const result = await this.userService.bulkUpdateRoles(req.user, payload);
		return result;
	}
	async bulkUpdateStatus(req, _, payload) {
		this.logger.debug(`Bulk updating status for ${payload.userIds.length} users`, {
			requesterId: req.user.id,
			disabled: payload.disabled,
		});
		const result = await this.userService.bulkUpdateStatus(req.user, payload);
		return result;
	}
	async bulkDeleteUsers(req, _, payload) {
		this.logger.debug(`Bulk deleting ${payload.userIds.length} users`, {
			requesterId: req.user.id,
			transferToUserId: payload.transferToUserId,
		});
		const result = await this.userService.bulkDeleteUsers(req.user, payload);
		return result;
	}
	async getUserAnalytics(req, _, userId, query) {
		if (userId !== req.user.id && !['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new forbidden_error_1.ForbiddenError('Access denied to user analytics');
		}
		this.logger.debug(`Fetching analytics for user ${userId}`, {
			requesterId: req.user.id,
			dateRange: { startDate: query.startDate, endDate: query.endDate },
		});
		return await this.userAnalyticsService.getUserMetrics(userId, query);
	}
	async getSystemUserAnalytics(req, _, query) {
		if (!['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new forbidden_error_1.ForbiddenError('Access denied to system analytics');
		}
		this.logger.debug('Fetching system user analytics', {
			requesterId: req.user.id,
			groupBy: query.groupBy,
			dateRange: { startDate: query.startDate, endDate: query.endDate },
		});
		return await this.userAnalyticsService.getSystemUserAnalytics(query);
	}
	async getUserEngagement(req, _, userId) {
		if (userId !== req.user.id && !['global:admin', 'global:owner'].includes(req.user.role)) {
			throw new forbidden_error_1.ForbiddenError('Access denied to user engagement data');
		}
		this.logger.debug(`Fetching engagement analytics for user ${userId}`, {
			requesterId: req.user.id,
		});
		return await this.userAnalyticsService.getUserEngagementAnalytics(userId);
	}
});
exports.UsersController = UsersController;
UsersController.ERROR_MESSAGES = {
	CHANGE_ROLE: {
		NO_USER: 'Target user not found',
		NO_ADMIN_ON_OWNER: 'Admin cannot change role on global owner',
		NO_OWNER_ON_OWNER: 'Owner cannot change role on global owner',
	},
};
__decorate(
	[
		(0, decorators_1.Get)('/'),
		(0, decorators_1.GlobalScope)('user:list'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.UsersListFilterDto]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'listUsers',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/password-reset-link'),
		(0, decorators_1.GlobalScope)('user:resetPassword'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'getUserPasswordResetLink',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:id/settings'),
		(0, decorators_1.GlobalScope)('user:update'),
		__param(2, decorators_1.Body),
		__param(3, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.SettingsUpdateRequestDto, String]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'updateUserSettings',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:id'),
		(0, decorators_1.GlobalScope)('user:delete'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'deleteUser',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:id/role'),
		(0, decorators_1.GlobalScope)('user:changeRole'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__param(3, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.RoleChangeRequestDto, String]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'changeGlobalRole',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk/invite'),
		(0, decorators_1.GlobalScope)('user:create'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.BulkInviteUsersRequestDto]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'bulkInviteUsers',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/bulk/roles'),
		(0, decorators_1.GlobalScope)('user:changeRole'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.BulkUpdateRolesRequestDto]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'bulkUpdateRoles',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/bulk/status'),
		(0, decorators_1.GlobalScope)('user:update'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.BulkStatusUpdateRequestDto]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'bulkUpdateStatus',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/bulk'),
		(0, decorators_1.GlobalScope)('user:delete'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.BulkDeleteUsersRequestDto]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'bulkDeleteUsers',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/analytics'),
		(0, decorators_1.GlobalScope)('user:read'),
		__param(2, (0, decorators_1.Param)('id')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, api_types_1.UserAnalyticsQueryDto]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'getUserAnalytics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/analytics/overview'),
		(0, decorators_1.GlobalScope)('user:list'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.UserAnalyticsQueryDto]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'getSystemUserAnalytics',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/engagement'),
		(0, decorators_1.GlobalScope)('user:read'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	UsersController.prototype,
	'getUserEngagement',
	null,
);
exports.UsersController =
	UsersController =
	UsersController_1 =
		__decorate(
			[
				(0, decorators_1.RestController)('/users'),
				__metadata('design:paramtypes', [
					backend_common_1.Logger,
					external_hooks_1.ExternalHooks,
					db_1.SharedCredentialsRepository,
					db_1.SharedWorkflowRepository,
					db_1.UserRepository,
					auth_service_1.AuthService,
					user_service_1.UserService,
					user_analytics_service_1.UserAnalyticsService,
					db_1.ProjectRepository,
					workflow_service_1.WorkflowService,
					credentials_service_1.CredentialsService,
					project_service_ee_1.ProjectService,
					event_service_1.EventService,
					folder_service_1.FolderService,
				]),
			],
			UsersController,
		);
//# sourceMappingURL=users.controller.js.map
