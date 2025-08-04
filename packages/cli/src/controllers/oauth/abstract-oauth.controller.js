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
exports.AbstractOAuthController = exports.skipAuthOnOAuthCallback = void 0;
exports.shouldSkipAuthOnOAuthCallback = shouldSkipAuthOnOAuthCallback;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const csrf_1 = __importDefault(require('csrf'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const constants_2 = require('@/constants');
const credentials_finder_service_1 = require('@/credentials/credentials-finder.service');
const credentials_helper_1 = require('@/credentials-helper');
const auth_error_1 = require('@/errors/response-errors/auth.error');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const external_hooks_1 = require('@/external-hooks');
const url_service_1 = require('@/services/url.service');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const MAX_CSRF_AGE = 5 * constants_1.Time.minutes.toMilliseconds;
function shouldSkipAuthOnOAuthCallback() {
	const value = process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK?.toLowerCase() ?? 'true';
	return value === 'true';
}
exports.skipAuthOnOAuthCallback = shouldSkipAuthOnOAuthCallback();
let AbstractOAuthController = class AbstractOAuthController {
	constructor(
		logger,
		externalHooks,
		credentialsHelper,
		credentialsRepository,
		credentialsFinderService,
		urlService,
		globalConfig,
	) {
		this.logger = logger;
		this.externalHooks = externalHooks;
		this.credentialsHelper = credentialsHelper;
		this.credentialsRepository = credentialsRepository;
		this.credentialsFinderService = credentialsFinderService;
		this.urlService = urlService;
		this.globalConfig = globalConfig;
	}
	get baseUrl() {
		const restUrl = `${this.urlService.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}`;
		return `${restUrl}/oauth${this.oauthVersion}-credential`;
	}
	async getCredential(req) {
		const { id: credentialId } = req.query;
		if (!credentialId) {
			throw new bad_request_error_1.BadRequestError('Required credential ID is missing');
		}
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:read'],
		);
		if (!credential) {
			this.logger.error(
				`OAuth${this.oauthVersion} credential authorization failed because the current user does not have the correct permissions`,
				{ userId: req.user.id },
			);
			throw new not_found_error_1.NotFoundError(constants_2.RESPONSE_ERROR_MESSAGES.NO_CREDENTIAL);
		}
		return credential;
	}
	async getAdditionalData() {
		return await WorkflowExecuteAdditionalData.getBase();
	}
	async getDecryptedDataForAuthUri(credential, additionalData) {
		return await this.getDecryptedData(credential, additionalData, false);
	}
	async getDecryptedDataForCallback(credential, additionalData) {
		return await this.getDecryptedData(credential, additionalData, true);
	}
	async getDecryptedData(credential, additionalData, raw) {
		return await this.credentialsHelper.getDecrypted(
			additionalData,
			credential,
			credential.type,
			'internal',
			undefined,
			raw,
		);
	}
	async applyDefaultsAndOverwrites(credential, decryptedData, additionalData) {
		return await this.credentialsHelper.applyDefaultsAndOverwrites(
			additionalData,
			decryptedData,
			credential,
			credential.type,
			'internal',
			undefined,
			undefined,
		);
	}
	async encryptAndSaveData(credential, toUpdate, toDelete = []) {
		const credentials = new n8n_core_1.Credentials(credential, credential.type, credential.data);
		credentials.updateData(toUpdate, toDelete);
		await this.credentialsRepository.update(credential.id, {
			...credentials.getDataToSave(),
			updatedAt: new Date(),
		});
	}
	async getCredentialWithoutUser(credentialId) {
		return await this.credentialsRepository.findOneBy({ id: credentialId });
	}
	createCsrfState(credentialsId, userId) {
		const token = new csrf_1.default();
		const csrfSecret = token.secretSync();
		const state = {
			token: token.create(csrfSecret),
			cid: credentialsId,
			createdAt: Date.now(),
			userId,
		};
		return [csrfSecret, Buffer.from(JSON.stringify(state)).toString('base64')];
	}
	decodeCsrfState(encodedState, req) {
		const errorMessage = 'Invalid state format';
		const decoded = (0, n8n_workflow_1.jsonParse)(Buffer.from(encodedState, 'base64').toString(), {
			errorMessage,
		});
		if (typeof decoded.cid !== 'string' || typeof decoded.token !== 'string') {
			throw new n8n_workflow_1.UnexpectedError(errorMessage);
		}
		if (decoded.userId !== req.user?.id) {
			throw new auth_error_1.AuthError('Unauthorized');
		}
		return decoded;
	}
	verifyCsrfState(decrypted, state) {
		const token = new csrf_1.default();
		return (
			Date.now() - state.createdAt <= MAX_CSRF_AGE &&
			decrypted.csrfSecret !== undefined &&
			token.verify(decrypted.csrfSecret, state.token)
		);
	}
	async resolveCredential(req) {
		const { state: encodedState } = req.query;
		const state = this.decodeCsrfState(encodedState, req);
		const credential = await this.getCredentialWithoutUser(state.cid);
		if (!credential) {
			throw new n8n_workflow_1.UnexpectedError(
				'OAuth callback failed because of insufficient permissions',
			);
		}
		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedDataForCallback(
			credential,
			additionalData,
		);
		const oauthCredentials = await this.applyDefaultsAndOverwrites(
			credential,
			decryptedDataOriginal,
			additionalData,
		);
		if (!this.verifyCsrfState(decryptedDataOriginal, state)) {
			throw new n8n_workflow_1.UnexpectedError('The OAuth callback state is invalid!');
		}
		return [credential, decryptedDataOriginal, oauthCredentials];
	}
	renderCallbackError(res, message, reason) {
		res.render('oauth-error-callback', { error: { message, reason } });
	}
};
exports.AbstractOAuthController = AbstractOAuthController;
exports.AbstractOAuthController = AbstractOAuthController = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			external_hooks_1.ExternalHooks,
			credentials_helper_1.CredentialsHelper,
			db_1.CredentialsRepository,
			credentials_finder_service_1.CredentialsFinderService,
			url_service_1.UrlService,
			config_1.GlobalConfig,
		]),
	],
	AbstractOAuthController,
);
//# sourceMappingURL=abstract-oauth.controller.js.map
