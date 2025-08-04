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
Object.defineProperty(exports, '__esModule', { value: true });
exports.OidcService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const client = __importStar(require('openid-client'));
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const url_service_1 = require('@/services/url.service');
const constants_1 = require('./constants');
const sso_helpers_1 = require('../sso-helpers');
const DEFAULT_OIDC_CONFIG = {
	clientId: '',
	clientSecret: '',
	discoveryEndpoint: '',
	loginEnabled: false,
};
const DEFAULT_OIDC_RUNTIME_CONFIG = {
	...DEFAULT_OIDC_CONFIG,
	discoveryEndpoint: new URL('http://n8n.io/not-set'),
};
let OidcService = class OidcService {
	constructor(
		settingsRepository,
		authIdentityRepository,
		urlService,
		globalConfig,
		userRepository,
		cipher,
		logger,
	) {
		this.settingsRepository = settingsRepository;
		this.authIdentityRepository = authIdentityRepository;
		this.urlService = urlService;
		this.globalConfig = globalConfig;
		this.userRepository = userRepository;
		this.cipher = cipher;
		this.logger = logger;
		this.oidcConfig = DEFAULT_OIDC_RUNTIME_CONFIG;
	}
	async init() {
		this.oidcConfig = await this.loadConfig(true);
		this.logger.debug(`OIDC login is ${this.oidcConfig.loginEnabled ? 'enabled' : 'disabled'}.`);
		await this.setOidcLoginEnabled(this.oidcConfig.loginEnabled);
	}
	getCallbackUrl() {
		return `${this.urlService.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}/sso/oidc/callback`;
	}
	getRedactedConfig() {
		return {
			...this.oidcConfig,
			discoveryEndpoint: this.oidcConfig.discoveryEndpoint.toString(),
			clientSecret: constants_1.OIDC_CLIENT_SECRET_REDACTED_VALUE,
		};
	}
	async generateLoginUrl() {
		const configuration = await this.getOidcConfiguration();
		const authorizationURL = client.buildAuthorizationUrl(configuration, {
			redirect_uri: this.getCallbackUrl(),
			response_type: 'code',
			scope: 'openid email profile',
			prompt: 'select_account',
		});
		return authorizationURL;
	}
	async loginUser(callbackUrl) {
		const configuration = await this.getOidcConfiguration();
		const tokens = await client.authorizationCodeGrant(configuration, callbackUrl);
		const claims = tokens.claims();
		if (!claims) {
			throw new forbidden_error_1.ForbiddenError('No claims found in the OIDC token');
		}
		const userInfo = await client.fetchUserInfo(configuration, tokens.access_token, claims.sub);
		if (!userInfo.email) {
			throw new bad_request_error_1.BadRequestError('An email is required');
		}
		const openidUser = await this.authIdentityRepository.findOne({
			where: { providerId: claims.sub, providerType: 'oidc' },
			relations: ['user'],
		});
		if (openidUser) {
			return openidUser.user;
		}
		const foundUser = await this.userRepository.findOneBy({ email: userInfo.email });
		if (foundUser) {
			this.logger.debug(
				`OIDC login: User with email ${userInfo.email} already exists, linking OIDC identity.`,
			);
			const id = this.authIdentityRepository.create({
				providerId: claims.sub,
				providerType: 'oidc',
				userId: foundUser.id,
			});
			await this.authIdentityRepository.save(id);
			return foundUser;
		}
		return await this.userRepository.manager.transaction(async (trx) => {
			const { user } = await this.userRepository.createUserWithProject(
				{
					firstName: userInfo.given_name,
					lastName: userInfo.family_name,
					email: userInfo.email,
					authIdentities: [],
					role: 'global:member',
					password: 'no password set',
				},
				trx,
			);
			await trx.save(
				trx.create(db_1.AuthIdentity, {
					providerId: claims.sub,
					providerType: 'oidc',
					userId: user.id,
				}),
			);
			return user;
		});
	}
	async loadConfig(decryptSecret = false) {
		const currentConfig = await this.settingsRepository.findOneBy({
			key: constants_1.OIDC_PREFERENCES_DB_KEY,
		});
		if (currentConfig) {
			try {
				const oidcConfig = (0, n8n_workflow_1.jsonParse)(currentConfig.value);
				if (oidcConfig.discoveryEndpoint === '') return DEFAULT_OIDC_RUNTIME_CONFIG;
				const discoveryUrl = new URL(oidcConfig.discoveryEndpoint);
				if (oidcConfig.clientSecret && decryptSecret) {
					oidcConfig.clientSecret = this.cipher.decrypt(oidcConfig.clientSecret);
				}
				return {
					...oidcConfig,
					discoveryEndpoint: discoveryUrl,
				};
			} catch (error) {
				this.logger.warn(
					'Failed to load OIDC configuration from database, falling back to default configuration.',
					{ error },
				);
			}
		}
		await this.settingsRepository.save({
			key: constants_1.OIDC_PREFERENCES_DB_KEY,
			value: JSON.stringify(DEFAULT_OIDC_CONFIG),
			loadOnStartup: true,
		});
		return DEFAULT_OIDC_RUNTIME_CONFIG;
	}
	async updateConfig(newConfig) {
		let discoveryEndpoint;
		try {
			discoveryEndpoint = new URL(newConfig.discoveryEndpoint);
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(
				'Provided discovery endpoint is not a valid URL',
			);
		}
		if (newConfig.clientSecret === constants_1.OIDC_CLIENT_SECRET_REDACTED_VALUE) {
			newConfig.clientSecret = this.oidcConfig.clientSecret;
		}
		await this.settingsRepository.update(
			{
				key: constants_1.OIDC_PREFERENCES_DB_KEY,
			},
			{
				value: JSON.stringify({
					...newConfig,
					clientSecret: this.cipher.encrypt(newConfig.clientSecret),
				}),
			},
		);
		this.oidcConfig = {
			...newConfig,
			discoveryEndpoint,
		};
		await this.setOidcLoginEnabled(this.oidcConfig.loginEnabled);
	}
	async setOidcLoginEnabled(enabled) {
		const currentAuthenticationMethod = (0, sso_helpers_1.getCurrentAuthenticationMethod)();
		if (
			enabled &&
			!(0, sso_helpers_1.isEmailCurrentAuthenticationMethod)() &&
			!(0, sso_helpers_1.isOidcCurrentAuthenticationMethod)()
		) {
			throw new internal_server_error_1.InternalServerError(
				`Cannot switch OIDC login enabled state when an authentication method other than email or OIDC is active (current: ${currentAuthenticationMethod})`,
			);
		}
		const targetAuthenticationMethod =
			!enabled && currentAuthenticationMethod === 'oidc' ? 'email' : currentAuthenticationMethod;
		di_1.Container.get(config_1.GlobalConfig).sso.oidc.loginEnabled = enabled;
		await (0, sso_helpers_1.setCurrentAuthenticationMethod)(
			enabled ? 'oidc' : targetAuthenticationMethod,
		);
	}
	async getOidcConfiguration() {
		const now = Date.now();
		if (
			this.cachedOidcConfiguration === undefined ||
			now >= this.cachedOidcConfiguration.validTill.getTime()
		) {
			this.cachedOidcConfiguration = {
				configuration: client.discovery(
					this.oidcConfig.discoveryEndpoint,
					this.oidcConfig.clientId,
					this.oidcConfig.clientSecret,
				),
				validTill: new Date(Date.now() + 60 * 60 * 1000),
			};
		}
		return await this.cachedOidcConfiguration.configuration;
	}
};
exports.OidcService = OidcService;
exports.OidcService = OidcService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.SettingsRepository,
			db_1.AuthIdentityRepository,
			url_service_1.UrlService,
			config_1.GlobalConfig,
			db_1.UserRepository,
			n8n_core_1.Cipher,
			backend_common_1.Logger,
		]),
	],
	OidcService,
);
//# sourceMappingURL=oidc.service.ee.js.map
