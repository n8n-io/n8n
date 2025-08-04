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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SamlService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const axios_1 = __importDefault(require('axios'));
const https_1 = __importDefault(require('https'));
const n8n_workflow_1 = require('n8n-workflow');
const auth_error_1 = require('@/errors/response-errors/auth.error');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const url_service_1 = require('@/services/url.service');
const constants_1 = require('./constants');
const invalid_saml_metadata_url_error_1 = require('./errors/invalid-saml-metadata-url.error');
const invalid_saml_metadata_error_1 = require('./errors/invalid-saml-metadata.error');
const saml_helpers_1 = require('./saml-helpers');
const saml_validator_1 = require('./saml-validator');
const service_provider_ee_1 = require('./service-provider.ee');
const sso_helpers_1 = require('../sso-helpers');
let SamlService = class SamlService {
	get samlPreferences() {
		return {
			...this._samlPreferences,
			loginEnabled: (0, saml_helpers_1.isSamlLoginEnabled)(),
			loginLabel: (0, saml_helpers_1.getSamlLoginLabel)(),
		};
	}
	constructor(logger, urlService, validator, userRepository, settingsRepository) {
		this.logger = logger;
		this.urlService = urlService;
		this.validator = validator;
		this.userRepository = userRepository;
		this.settingsRepository = settingsRepository;
		this._samlPreferences = {
			mapping: {
				email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
				firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
				lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
				userPrincipalName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
			},
			metadata: '',
			metadataUrl: '',
			ignoreSSL: false,
			loginBinding: 'redirect',
			acsBinding: 'post',
			authnRequestsSigned: false,
			loginEnabled: false,
			loginLabel: 'SAML',
			wantAssertionsSigned: true,
			wantMessageSigned: true,
			relayState: this.urlService.getInstanceBaseUrl(),
			signatureConfig: {
				prefix: 'ds',
				location: {
					reference: '/samlp:Response/saml:Issuer',
					action: 'after',
				},
			},
		};
	}
	async init() {
		try {
			await this.loadFromDbAndApplySamlPreferences(false);
			await this.validator.init();
			if ((0, saml_helpers_1.isSamlLicensedAndEnabled)()) {
				await this.loadSamlify();
				await this.loadFromDbAndApplySamlPreferences(true);
			}
		} catch (error) {
			if (
				error instanceof invalid_saml_metadata_url_error_1.InvalidSamlMetadataUrlError ||
				error instanceof invalid_saml_metadata_error_1.InvalidSamlMetadataError ||
				error instanceof SyntaxError
			) {
				this.logger.warn(
					`SAML initialization failed because of invalid metadata in database: ${error.message}. IMPORTANT: Disabling SAML and switching to email-based login for all users. Please review your configuration and re-enable SAML.`,
				);
				await this.reset();
			} else {
				throw error;
			}
		}
	}
	async loadSamlify() {
		if (this.samlify === undefined) {
			this.logger.debug('Loading samlify library into memory');
			this.samlify = await Promise.resolve().then(() => __importStar(require('samlify')));
		}
		this.samlify.setSchemaValidator({
			validate: async (response) => {
				const valid = await this.validator.validateResponse(response);
				if (!valid) {
					throw new invalid_saml_metadata_error_1.InvalidSamlMetadataError();
				}
			},
		});
	}
	getIdentityProviderInstance(forceRecreate = false) {
		if (this.samlify === undefined) {
			throw new n8n_workflow_1.UnexpectedError('Samlify is not initialized');
		}
		if (this.identityProviderInstance === undefined || forceRecreate) {
			this.identityProviderInstance = this.samlify.IdentityProvider({
				metadata: this._samlPreferences.metadata,
			});
		}
		this.validator.validateIdentiyProvider(this.identityProviderInstance);
		return this.identityProviderInstance;
	}
	getServiceProviderInstance() {
		if (this.samlify === undefined) {
			throw new n8n_workflow_1.UnexpectedError('Samlify is not initialized');
		}
		return (0, service_provider_ee_1.getServiceProviderInstance)(
			this._samlPreferences,
			this.samlify,
		);
	}
	async getLoginRequestUrl(relayState, binding) {
		await this.loadSamlify();
		if (binding === undefined) binding = this._samlPreferences.loginBinding ?? 'redirect';
		if (binding === 'post') {
			return {
				binding,
				context: this.getPostLoginRequestUrl(relayState),
			};
		} else {
			return {
				binding,
				context: this.getRedirectLoginRequestUrl(relayState),
			};
		}
	}
	getRedirectLoginRequestUrl(relayState) {
		const sp = this.getServiceProviderInstance();
		sp.entitySetting.relayState = relayState ?? this.urlService.getInstanceBaseUrl();
		const loginRequest = sp.createLoginRequest(this.getIdentityProviderInstance(), 'redirect');
		return loginRequest;
	}
	getPostLoginRequestUrl(relayState) {
		const sp = this.getServiceProviderInstance();
		sp.entitySetting.relayState = relayState ?? this.urlService.getInstanceBaseUrl();
		const loginRequest = sp.createLoginRequest(this.getIdentityProviderInstance(), 'post');
		return loginRequest;
	}
	async handleSamlLogin(req, binding) {
		const attributes = await this.getAttributesFromLoginResponse(req, binding);
		if (attributes.email) {
			const lowerCasedEmail = attributes.email.toLowerCase();
			const user = await this.userRepository.findOne({
				where: { email: lowerCasedEmail },
				relations: ['authIdentities'],
			});
			if (user) {
				if (
					user.authIdentities.find(
						(e) => e.providerType === 'saml' && e.providerId === attributes.userPrincipalName,
					)
				) {
					return {
						authenticatedUser: user,
						attributes,
						onboardingRequired: false,
					};
				} else {
					const updatedUser = await (0, saml_helpers_1.updateUserFromSamlAttributes)(
						user,
						attributes,
					);
					const onboardingRequired = !updatedUser.firstName || !updatedUser.lastName;
					return {
						authenticatedUser: updatedUser,
						attributes,
						onboardingRequired,
					};
				}
			} else {
				if ((0, sso_helpers_1.isSsoJustInTimeProvisioningEnabled)()) {
					const newUser = await (0, saml_helpers_1.createUserFromSamlAttributes)(attributes);
					return {
						authenticatedUser: newUser,
						attributes,
						onboardingRequired: true,
					};
				}
			}
		}
		return {
			authenticatedUser: undefined,
			attributes,
			onboardingRequired: false,
		};
	}
	async setSamlPreferences(prefs, tryFallback = false) {
		await this.loadSamlify();
		const previousMetadataUrl = this._samlPreferences.metadataUrl;
		await this.loadPreferencesWithoutValidation(prefs);
		if (prefs.metadataUrl) {
			try {
				const fetchedMetadata = await this.fetchMetadataFromUrl();
				if (fetchedMetadata) {
					this._samlPreferences.metadata = fetchedMetadata;
				} else {
					throw new invalid_saml_metadata_url_error_1.InvalidSamlMetadataUrlError(
						prefs.metadataUrl,
					);
				}
			} catch (error) {
				this._samlPreferences.metadataUrl = previousMetadataUrl;
				if (!tryFallback) {
					throw error;
				}
				this.logger.error(
					'SAML initialization detected an invalid metadata URL in database. Trying to initialize from metadata in database if available.',
					{ error },
				);
			}
		} else if (prefs.metadata) {
			const validationResult = await this.validator.validateMetadata(prefs.metadata);
			if (!validationResult) {
				throw new invalid_saml_metadata_error_1.InvalidSamlMetadataError();
			}
		}
		if ((0, saml_helpers_1.isSamlLoginEnabled)()) {
			if (this._samlPreferences.metadata) {
				const validationResult = await this.validator.validateMetadata(
					this._samlPreferences.metadata,
				);
				if (!validationResult) {
					throw new invalid_saml_metadata_error_1.InvalidSamlMetadataError();
				}
			} else {
				throw new invalid_saml_metadata_error_1.InvalidSamlMetadataError();
			}
		}
		this.getIdentityProviderInstance(true);
		const result = await this.saveSamlPreferencesToDb();
		return result;
	}
	async loadPreferencesWithoutValidation(prefs) {
		this._samlPreferences.loginBinding = prefs.loginBinding ?? this._samlPreferences.loginBinding;
		this._samlPreferences.metadata = prefs.metadata ?? this._samlPreferences.metadata;
		this._samlPreferences.mapping = prefs.mapping ?? this._samlPreferences.mapping;
		this._samlPreferences.ignoreSSL = prefs.ignoreSSL ?? this._samlPreferences.ignoreSSL;
		this._samlPreferences.acsBinding = prefs.acsBinding ?? this._samlPreferences.acsBinding;
		this._samlPreferences.signatureConfig =
			prefs.signatureConfig ?? this._samlPreferences.signatureConfig;
		this._samlPreferences.authnRequestsSigned =
			prefs.authnRequestsSigned ?? this._samlPreferences.authnRequestsSigned;
		this._samlPreferences.wantAssertionsSigned =
			prefs.wantAssertionsSigned ?? this._samlPreferences.wantAssertionsSigned;
		this._samlPreferences.wantMessageSigned =
			prefs.wantMessageSigned ?? this._samlPreferences.wantMessageSigned;
		if (prefs.metadataUrl) {
			this._samlPreferences.metadataUrl = prefs.metadataUrl;
		} else if (prefs.metadata) {
			this._samlPreferences.metadataUrl = undefined;
			this._samlPreferences.metadata = prefs.metadata;
		}
		await (0, saml_helpers_1.setSamlLoginEnabled)(
			prefs.loginEnabled ?? (0, saml_helpers_1.isSamlLoginEnabled)(),
		);
		(0, saml_helpers_1.setSamlLoginLabel)(
			prefs.loginLabel ?? (0, saml_helpers_1.getSamlLoginLabel)(),
		);
	}
	async loadFromDbAndApplySamlPreferences(apply = true) {
		const samlPreferences = await this.settingsRepository.findOne({
			where: { key: constants_1.SAML_PREFERENCES_DB_KEY },
		});
		if (samlPreferences) {
			const prefs = (0, n8n_workflow_1.jsonParse)(samlPreferences.value);
			if (prefs) {
				if (apply) {
					await this.setSamlPreferences(prefs, true);
				} else {
					await this.loadPreferencesWithoutValidation(prefs);
				}
				return prefs;
			}
		}
		return;
	}
	async saveSamlPreferencesToDb() {
		const samlPreferences = await this.settingsRepository.findOne({
			where: { key: constants_1.SAML_PREFERENCES_DB_KEY },
		});
		const settingsValue = JSON.stringify(this.samlPreferences);
		let result;
		if (samlPreferences) {
			samlPreferences.value = settingsValue;
			result = await this.settingsRepository.save(samlPreferences, {
				transaction: false,
			});
		} else {
			result = await this.settingsRepository.save(
				{
					key: constants_1.SAML_PREFERENCES_DB_KEY,
					value: settingsValue,
					loadOnStartup: true,
				},
				{ transaction: false },
			);
		}
		if (result) return (0, n8n_workflow_1.jsonParse)(result.value);
		return;
	}
	async fetchMetadataFromUrl() {
		await this.loadSamlify();
		if (!this._samlPreferences.metadataUrl)
			throw new bad_request_error_1.BadRequestError(
				'Error fetching SAML Metadata, no Metadata URL set',
			);
		try {
			const agent = new https_1.default.Agent({
				rejectUnauthorized: !this._samlPreferences.ignoreSSL,
			});
			const response = await axios_1.default.get(this._samlPreferences.metadataUrl, {
				httpsAgent: agent,
			});
			if (response.status === 200 && response.data) {
				const xml = await response.data;
				const validationResult = await this.validator.validateMetadata(xml);
				if (!validationResult) {
					throw new bad_request_error_1.BadRequestError(
						`Data received from ${this._samlPreferences.metadataUrl} is not valid SAML metadata.`,
					);
				}
				return xml;
			}
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(
				`Error fetching SAML Metadata from ${this._samlPreferences.metadataUrl}: ${error}`,
			);
		}
		return;
	}
	async getAttributesFromLoginResponse(req, binding) {
		let parsedSamlResponse;
		if (!this._samlPreferences.mapping)
			throw new bad_request_error_1.BadRequestError(
				'Error fetching SAML Attributes, no Attribute mapping set',
			);
		try {
			await this.loadSamlify();
			parsedSamlResponse = await this.getServiceProviderInstance().parseLoginResponse(
				this.getIdentityProviderInstance(),
				binding,
				req,
			);
		} catch (error) {
			throw new auth_error_1.AuthError(
				`SAML Authentication failed. Could not parse SAML response. ${error instanceof Error ? error.message : error}`,
			);
		}
		const { attributes, missingAttributes } = (0,
		saml_helpers_1.getMappedSamlAttributesFromFlowResult)(
			parsedSamlResponse,
			this._samlPreferences.mapping,
		);
		if (!attributes) {
			throw new auth_error_1.AuthError('SAML Authentication failed. Invalid SAML response.');
		}
		if (missingAttributes.length > 0) {
			throw new auth_error_1.AuthError(
				`SAML Authentication failed. Invalid SAML response (missing attributes: ${missingAttributes.join(', ')}).`,
			);
		}
		return attributes;
	}
	async reset() {
		await (0, saml_helpers_1.setSamlLoginEnabled)(false);
		await this.settingsRepository.delete({ key: constants_1.SAML_PREFERENCES_DB_KEY });
	}
};
exports.SamlService = SamlService;
exports.SamlService = SamlService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			url_service_1.UrlService,
			saml_validator_1.SamlValidator,
			db_1.UserRepository,
			db_1.SettingsRepository,
		]),
	],
	SamlService,
);
//# sourceMappingURL=saml.service.ee.js.map
