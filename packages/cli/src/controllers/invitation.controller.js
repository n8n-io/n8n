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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.InvitationController = void 0;
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const auth_service_1 = require('@/auth/auth.service');
const config_1 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const license_1 = require('@/license');
const posthog_1 = require('@/posthog');
const password_utility_1 = require('@/services/password.utility');
const user_service_1 = require('@/services/user.service');
const saml_helpers_1 = require('@/sso.ee/saml/saml-helpers');
let InvitationController = class InvitationController {
	constructor(
		logger,
		externalHooks,
		authService,
		userService,
		license,
		passwordUtility,
		userRepository,
		postHog,
		eventService,
	) {
		this.logger = logger;
		this.externalHooks = externalHooks;
		this.authService = authService;
		this.userService = userService;
		this.license = license;
		this.passwordUtility = passwordUtility;
		this.userRepository = userRepository;
		this.postHog = postHog;
		this.eventService = eventService;
	}
	async inviteUser(req, _res, invitations) {
		if (invitations.length === 0) return [];
		const isWithinUsersLimit = this.license.isWithinUsersLimit();
		if ((0, saml_helpers_1.isSamlLicensedAndEnabled)()) {
			this.logger.debug(
				'SAML is enabled, so users are managed by the Identity Provider and cannot be added through invites',
			);
			throw new bad_request_error_1.BadRequestError(
				'SAML is enabled, so users are managed by the Identity Provider and cannot be added through invites',
			);
		}
		if (!isWithinUsersLimit) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because the user limit quota has been reached',
			);
			throw new forbidden_error_1.ForbiddenError(
				constants_1.RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED,
			);
		}
		if (!config_1.default.getEnv('userManagement.isInstanceOwnerSetUp')) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because the owner account is not set up',
			);
			throw new bad_request_error_1.BadRequestError(
				'You must set up your own account before inviting others',
			);
		}
		const attributes = invitations.map(({ email, role }) => {
			if (role === 'global:admin' && !this.license.isAdvancedPermissionsLicensed()) {
				throw new forbidden_error_1.ForbiddenError(
					'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
				);
			}
			return { email, role };
		});
		const { usersInvited, usersCreated } = await this.userService.inviteUsers(req.user, attributes);
		await this.externalHooks.run('user.invited', [usersCreated]);
		return usersInvited;
	}
	async acceptInvitation(req, res, payload, inviteeId) {
		const { inviterId, firstName, lastName, password } = payload;
		const users = await this.userRepository.findManyByIds([inviterId, inviteeId]);
		if (users.length !== 2) {
			this.logger.debug(
				'Request to fill out a user shell failed because the inviter ID and/or invitee ID were not found in database',
				{
					inviterId,
					inviteeId,
				},
			);
			throw new bad_request_error_1.BadRequestError('Invalid payload or URL');
		}
		const invitee = users.find((user) => user.id === inviteeId);
		if (invitee.password) {
			this.logger.debug(
				'Request to fill out a user shell failed because the invite had already been accepted',
				{ inviteeId },
			);
			throw new bad_request_error_1.BadRequestError('This invite has been accepted already');
		}
		invitee.firstName = firstName;
		invitee.lastName = lastName;
		invitee.password = await this.passwordUtility.hash(password);
		const updatedUser = await this.userRepository.save(invitee, { transaction: false });
		this.authService.issueCookie(res, updatedUser, false, req.browserId);
		this.eventService.emit('user-signed-up', {
			user: updatedUser,
			userType: 'email',
			wasDisabledLdapUser: false,
		});
		const publicInvitee = await this.userService.toPublic(invitee);
		await this.externalHooks.run('user.profile.update', [invitee.email, publicInvitee]);
		await this.externalHooks.run('user.password.update', [invitee.email, invitee.password]);
		return await this.userService.toPublic(updatedUser, {
			posthog: this.postHog,
			withScopes: true,
		});
	}
};
exports.InvitationController = InvitationController;
__decorate(
	[
		(0, decorators_1.Post)('/', { rateLimit: { limit: 10 } }),
		(0, decorators_1.GlobalScope)('user:create'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.InviteUsersRequestDto]),
		__metadata('design:returntype', Promise),
	],
	InvitationController.prototype,
	'inviteUser',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/accept', { skipAuth: true }),
		__param(2, decorators_1.Body),
		__param(3, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			api_types_1.AcceptInvitationRequestDto,
			String,
		]),
		__metadata('design:returntype', Promise),
	],
	InvitationController.prototype,
	'acceptInvitation',
	null,
);
exports.InvitationController = InvitationController = __decorate(
	[
		(0, decorators_1.RestController)('/invitations'),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			external_hooks_1.ExternalHooks,
			auth_service_1.AuthService,
			user_service_1.UserService,
			license_1.License,
			password_utility_1.PasswordUtility,
			db_1.UserRepository,
			posthog_1.PostHogClient,
			event_service_1.EventService,
		]),
	],
	InvitationController,
);
//# sourceMappingURL=invitation.controller.js.map
