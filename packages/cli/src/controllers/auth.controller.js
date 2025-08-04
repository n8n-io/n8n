'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuthController = void 0;
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const class_validator_1 = require('class-validator');
const auth_1 = require('@/auth');
const auth_service_1 = require('@/auth/auth.service');
const constants_1 = require('@/constants');
const auth_error_1 = require('@/errors/response-errors/auth.error');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const event_service_1 = require('@/events/event.service');
const license_1 = require('@/license');
const mfa_service_1 = require('@/mfa/mfa.service');
const posthog_1 = require('@/posthog');
const user_service_1 = require('@/services/user.service');
const sso_helpers_1 = require('@/sso.ee/sso-helpers');
let AuthController = class AuthController {
	constructor(
		logger,
		authService,
		mfaService,
		userService,
		license,
		userRepository,
		eventService,
		postHog,
	) {
		this.logger = logger;
		this.authService = authService;
		this.mfaService = mfaService;
		this.userService = userService;
		this.license = license;
		this.userRepository = userRepository;
		this.eventService = eventService;
		this.postHog = postHog;
	}
	async login(req, res, payload) {
		const { emailOrLdapLoginId, password, mfaCode, mfaRecoveryCode } = payload;
		let user;
		let usedAuthenticationMethod = (0, sso_helpers_1.getCurrentAuthenticationMethod)();
		if (
			usedAuthenticationMethod === 'email' &&
			!(0, class_validator_1.isEmail)(emailOrLdapLoginId)
		) {
			throw new bad_request_error_1.BadRequestError('Invalid email address');
		}
		if ((0, sso_helpers_1.isSamlCurrentAuthenticationMethod)()) {
			const preliminaryUser = await (0, auth_1.handleEmailLogin)(emailOrLdapLoginId, password);
			if (
				preliminaryUser?.role === 'global:owner' ||
				preliminaryUser?.settings?.allowSSOManualLogin
			) {
				user = preliminaryUser;
				usedAuthenticationMethod = 'email';
			} else {
				throw new auth_error_1.AuthError('SSO is enabled, please log in with SSO');
			}
		} else if ((0, sso_helpers_1.isLdapCurrentAuthenticationMethod)()) {
			const preliminaryUser = await (0, auth_1.handleEmailLogin)(emailOrLdapLoginId, password);
			if (preliminaryUser?.role === 'global:owner') {
				user = preliminaryUser;
				usedAuthenticationMethod = 'email';
			} else {
				const { LdapService } = await Promise.resolve().then(() =>
					__importStar(require('@/ldap.ee/ldap.service.ee')),
				);
				user = await di_1.Container.get(LdapService).handleLdapLogin(emailOrLdapLoginId, password);
			}
		} else {
			user = await (0, auth_1.handleEmailLogin)(emailOrLdapLoginId, password);
		}
		if (user) {
			if (user.mfaEnabled) {
				if (!mfaCode && !mfaRecoveryCode) {
					throw new auth_error_1.AuthError('MFA Error', 998);
				}
				const isMfaCodeOrMfaRecoveryCodeValid = await this.mfaService.validateMfa(
					user.id,
					mfaCode,
					mfaRecoveryCode,
				);
				if (!isMfaCodeOrMfaRecoveryCodeValid) {
					throw new auth_error_1.AuthError('Invalid mfa token or recovery code');
				}
			}
			this.authService.issueCookie(res, user, user.mfaEnabled, req.browserId);
			this.eventService.emit('user-logged-in', {
				user,
				authenticationMethod: usedAuthenticationMethod,
			});
			return await this.userService.toPublic(user, {
				posthog: this.postHog,
				withScopes: true,
				mfaAuthenticated: user.mfaEnabled,
			});
		}
		this.eventService.emit('user-login-failed', {
			authenticationMethod: usedAuthenticationMethod,
			userEmail: emailOrLdapLoginId,
			reason: 'wrong credentials',
		});
		throw new auth_error_1.AuthError('Wrong username or password. Do you have caps lock on?');
	}
	async currentUser(req) {
		return await this.userService.toPublic(req.user, {
			posthog: this.postHog,
			withScopes: true,
			mfaAuthenticated: req.authInfo?.usedMfa,
		});
	}
	async resolveSignupToken(_req, _res, payload) {
		const { inviterId, inviteeId } = payload;
		const isWithinUsersLimit = this.license.isWithinUsersLimit();
		if (!isWithinUsersLimit) {
			this.logger.debug('Request to resolve signup token failed because of users quota reached', {
				inviterId,
				inviteeId,
			});
			throw new forbidden_error_1.ForbiddenError(
				constants_1.RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED,
			);
		}
		const users = await this.userRepository.findManyByIds([inviterId, inviteeId]);
		if (users.length !== 2) {
			this.logger.debug(
				'Request to resolve signup token failed because the ID of the inviter and/or the ID of the invitee were not found in database',
				{ inviterId, inviteeId },
			);
			throw new bad_request_error_1.BadRequestError('Invalid invite URL');
		}
		const invitee = users.find((user) => user.id === inviteeId);
		if (!invitee || invitee.password) {
			this.logger.error('Invalid invite URL - invitee already setup', {
				inviterId,
				inviteeId,
			});
			throw new bad_request_error_1.BadRequestError(
				'The invitation was likely either deleted or already claimed',
			);
		}
		const inviter = users.find((user) => user.id === inviterId);
		if (!inviter?.email || !inviter?.firstName) {
			this.logger.error(
				'Request to resolve signup token failed because inviter does not exist or is not set up',
				{
					inviterId: inviter?.id,
				},
			);
			throw new bad_request_error_1.BadRequestError('Invalid request');
		}
		this.eventService.emit('user-invite-email-click', { inviter, invitee });
		const { firstName, lastName } = inviter;
		return { inviter: { firstName, lastName } };
	}
	async logout(req, res) {
		await this.authService.invalidateToken(req);
		this.authService.clearCookie(res);
		return { loggedOut: true };
	}
};
exports.AuthController = AuthController;
__decorate(
	[
		(0, decorators_1.Post)('/login', { skipAuth: true, rateLimit: true }),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.LoginRequestDto]),
		__metadata('design:returntype', Promise),
	],
	AuthController.prototype,
	'login',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/login', {
			allowSkipMFA: true,
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	AuthController.prototype,
	'currentUser',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/resolve-signup-token', { skipAuth: true }),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.ResolveSignupTokenQueryDto]),
		__metadata('design:returntype', Promise),
	],
	AuthController.prototype,
	'resolveSignupToken',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/logout'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AuthController.prototype,
	'logout',
	null,
);
exports.AuthController = AuthController = __decorate(
	[
		(0, decorators_1.RestController)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			auth_service_1.AuthService,
			mfa_service_1.MfaService,
			user_service_1.UserService,
			license_1.License,
			db_1.UserRepository,
			event_service_1.EventService,
			posthog_1.PostHogClient,
		]),
	],
	AuthController,
);
//# sourceMappingURL=auth.controller.js.map
