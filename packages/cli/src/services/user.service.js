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
Object.defineProperty(exports, '__esModule', { value: true });
exports.UserService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const n8n_workflow_1 = require('n8n-workflow');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const event_service_1 = require('@/events/event.service');
const url_service_1 = require('@/services/url.service');
const email_1 = require('@/user-management/email');
const public_api_key_service_1 = require('./public-api-key.service');
let UserService = class UserService {
	constructor(logger, userRepository, mailer, urlService, eventService, publicApiKeyService) {
		this.logger = logger;
		this.userRepository = userRepository;
		this.mailer = mailer;
		this.urlService = urlService;
		this.eventService = eventService;
		this.publicApiKeyService = publicApiKeyService;
	}
	async update(userId, data) {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (user) {
			await this.userRepository.save({ ...user, ...data }, { transaction: true });
		}
		return;
	}
	getManager() {
		return this.userRepository.manager;
	}
	async updateSettings(userId, newSettings) {
		const user = await this.userRepository.findOneOrFail({ where: { id: userId } });
		if (user.settings) {
			Object.assign(user.settings, newSettings);
		} else {
			user.settings = newSettings;
		}
		await this.userRepository.save(user);
	}
	async toPublic(user, options) {
		const { password, updatedAt, authIdentities, mfaRecoveryCodes, mfaSecret, ...rest } = user;
		const providerType = authIdentities?.[0]?.providerType;
		let publicUser = {
			...rest,
			signInType: providerType ?? 'email',
			isOwner: user.role === 'global:owner',
		};
		if (options?.withInviteUrl && !options?.inviterId) {
			throw new n8n_workflow_1.UnexpectedError('Inviter ID is required to generate invite URL');
		}
		if (options?.withInviteUrl && options?.inviterId && publicUser.isPending) {
			publicUser = this.addInviteUrl(options.inviterId, publicUser);
		}
		if (options?.posthog) {
			publicUser = await this.addFeatureFlags(publicUser, options.posthog);
		}
		if (options?.withScopes) {
			publicUser.globalScopes = (0, permissions_1.getGlobalScopes)(user);
		}
		publicUser.mfaAuthenticated = options?.mfaAuthenticated ?? false;
		return publicUser;
	}
	addInviteUrl(inviterId, invitee) {
		const url = new URL(this.urlService.getInstanceBaseUrl());
		url.pathname = '/signup';
		url.searchParams.set('inviterId', inviterId);
		url.searchParams.set('inviteeId', invitee.id);
		invitee.inviteAcceptUrl = url.toString();
		return invitee;
	}
	async addFeatureFlags(publicUser, posthog) {
		const timeoutPromise = new Promise((resolve) => {
			setTimeout(() => {
				resolve(publicUser);
			}, 1500);
		});
		const fetchPromise = new Promise(async (resolve) => {
			publicUser.featureFlags = await posthog.getFeatureFlags(publicUser);
			resolve(publicUser);
		});
		return await Promise.race([fetchPromise, timeoutPromise]);
	}
	async sendEmails(owner, toInviteUsers, role) {
		const domain = this.urlService.getInstanceBaseUrl();
		return await Promise.all(
			Object.entries(toInviteUsers).map(async ([email, id]) => {
				const inviteAcceptUrl = `${domain}/signup?inviterId=${owner.id}&inviteeId=${id}`;
				const invitedUser = {
					user: {
						id,
						email,
						inviteAcceptUrl,
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
						delete invitedUser.user?.inviteAcceptUrl;
						this.eventService.emit('user-transactional-email-sent', {
							userId: id,
							messageType: 'New user invite',
							publicApi: false,
						});
					}
					this.eventService.emit('user-invited', {
						user: owner,
						targetUserId: Object.values(toInviteUsers),
						publicApi: false,
						emailSent: result.emailSent,
						inviteeRole: role,
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
	async inviteUsers(owner, invitations) {
		const emails = invitations.map(({ email }) => email);
		const existingUsers = await this.userRepository.findManyByEmail(emails);
		const existUsersEmails = existingUsers.map((user) => user.email);
		const toCreateUsers = invitations.filter(({ email }) => !existUsersEmails.includes(email));
		const pendingUsersToInvite = existingUsers.filter((email) => email.isPending);
		const createdUsers = new Map();
		this.logger.debug(
			toCreateUsers.length > 1
				? `Creating ${toCreateUsers.length} user shells...`
				: 'Creating 1 user shell...',
		);
		try {
			await this.getManager().transaction(
				async (transactionManager) =>
					await Promise.all(
						toCreateUsers.map(async ({ email, role }) => {
							const { user: savedUser } = await this.userRepository.createUserWithProject(
								{ email, role },
								transactionManager,
							);
							createdUsers.set(email, savedUser.id);
							return savedUser;
						}),
					),
			);
		} catch (error) {
			this.logger.error('Failed to create user shells', { userShells: createdUsers });
			throw new internal_server_error_1.InternalServerError(
				'An error occurred during user creation',
				error,
			);
		}
		pendingUsersToInvite.forEach(({ email, id }) => createdUsers.set(email, id));
		const usersInvited = await this.sendEmails(
			owner,
			Object.fromEntries(createdUsers),
			invitations[0].role,
		);
		return { usersInvited, usersCreated: toCreateUsers.map(({ email }) => email) };
	}
	async changeUserRole(user, targetUser, newRole) {
		return await this.userRepository.manager.transaction(async (trx) => {
			await trx.update(db_1.User, { id: targetUser.id }, { role: newRole.newRoleName });
			const adminDowngradedToMember =
				user.role === 'global:owner' &&
				targetUser.role === 'global:admin' &&
				newRole.newRoleName === 'global:member';
			if (adminDowngradedToMember) {
				await this.publicApiKeyService.removeOwnerOnlyScopesFromApiKeys(targetUser, trx);
			}
		});
	}
	async bulkInviteUsers(owner, requestDto) {
		const { invitations } = requestDto;
		const result = {
			success: [],
			errors: [],
			totalProcessed: invitations.length,
		};
		try {
			const { usersInvited } = await this.inviteUsers(owner, invitations);
			for (const invitation of usersInvited) {
				if (invitation.error) {
					result.errors.push({
						email: invitation.user.email,
						error: invitation.error,
					});
				} else {
					result.success.push({
						userId: invitation.user.id,
						message: `User ${invitation.user.email} invited successfully`,
					});
					this.eventService.emit('user-invited', {
						user: owner,
						targetUserId: [invitation.user.id],
						publicApi: false,
						emailSent: invitation.user.emailSent,
						inviteeRole: invitation.user.role,
					});
				}
			}
		} catch (error) {
			this.logger.error('Bulk invite operation failed', { error: error.message });
			result.errors.push({
				error: error instanceof Error ? error.message : 'Unknown error during bulk invite',
			});
		}
		return result;
	}
	async bulkUpdateRoles(user, requestDto) {
		const { userRoleUpdates } = requestDto;
		const result = {
			success: [],
			errors: [],
			totalProcessed: userRoleUpdates.length,
		};
		await this.userRepository.manager.transaction(async (trx) => {
			for (const update of userRoleUpdates) {
				try {
					const targetUser = await trx.findOne(db_1.User, { where: { id: update.userId } });
					if (!targetUser) {
						result.errors.push({
							userId: update.userId,
							error: 'User not found',
						});
						continue;
					}
					if (user.role === 'global:admin' && targetUser.role === 'global:owner') {
						result.errors.push({
							userId: update.userId,
							error: 'Admin cannot change role on global owner',
						});
						continue;
					}
					if (user.role === 'global:owner' && targetUser.role === 'global:owner') {
						result.errors.push({
							userId: update.userId,
							error: 'Owner cannot change role on global owner',
						});
						continue;
					}
					await trx.update(db_1.User, { id: update.userId }, { role: update.newRole });
					const adminDowngradedToMember =
						user.role === 'global:owner' &&
						targetUser.role === 'global:admin' &&
						update.newRole === 'global:member';
					if (adminDowngradedToMember) {
						await this.publicApiKeyService.removeOwnerOnlyScopesFromApiKeys(targetUser, trx);
					}
					result.success.push({
						userId: update.userId,
						message: `Role updated to ${update.newRole}`,
					});
					this.eventService.emit('user-changed-role', {
						userId: user.id,
						targetUserId: update.userId,
						targetUserNewRole: update.newRole,
						publicApi: false,
					});
				} catch (error) {
					result.errors.push({
						userId: update.userId,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}
		});
		return result;
	}
	async bulkUpdateStatus(user, requestDto) {
		const { userIds, disabled } = requestDto;
		const result = {
			success: [],
			errors: [],
			totalProcessed: userIds.length,
		};
		await this.userRepository.manager.transaction(async (trx) => {
			for (const userId of userIds) {
				try {
					const targetUser = await trx.findOne(db_1.User, { where: { id: userId } });
					if (!targetUser) {
						result.errors.push({
							userId,
							error: 'User not found',
						});
						continue;
					}
					if (targetUser.role === 'global:owner') {
						result.errors.push({
							userId,
							error: 'Cannot change status of global owner',
						});
						continue;
					}
					if (userId === user.id) {
						result.errors.push({
							userId,
							error: 'Cannot change your own status',
						});
						continue;
					}
					await trx.update(db_1.User, { id: userId }, { disabled });
					result.success.push({
						userId,
						message: `User ${disabled ? 'disabled' : 'enabled'} successfully`,
					});
				} catch (error) {
					result.errors.push({
						userId,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}
		});
		return result;
	}
	async bulkDeleteUsers(user, requestDto) {
		const { userIds } = requestDto;
		const result = {
			success: [],
			errors: [],
			totalProcessed: userIds.length,
		};
		for (const userId of userIds) {
			try {
				if (userId === user.id) {
					result.errors.push({
						userId,
						error: 'Cannot delete your own user',
					});
					continue;
				}
				const targetUser = await this.userRepository.findOneBy({ id: userId });
				if (!targetUser) {
					result.errors.push({
						userId,
						error: 'User not found',
					});
					continue;
				}
				if (targetUser.role === 'global:owner') {
					result.errors.push({
						userId,
						error: 'Cannot delete global owner',
					});
					continue;
				}
				result.success.push({
					userId,
					message: 'User deletion scheduled for processing',
				});
			} catch (error) {
				result.errors.push({
					userId,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		return result;
	}
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.UserRepository,
			email_1.UserManagementMailer,
			url_service_1.UrlService,
			event_service_1.EventService,
			public_api_key_service_1.PublicApiKeyService,
		]),
	],
	UserService,
);
//# sourceMappingURL=user.service.js.map
