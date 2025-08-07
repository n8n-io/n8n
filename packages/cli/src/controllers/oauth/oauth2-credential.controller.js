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
exports.OAuth2CredentialController = void 0;
const client_oauth2_1 = require('@n8n/client-oauth2');
const decorators_1 = require('@n8n/decorators');
const omit_1 = __importDefault(require('lodash/omit'));
const set_1 = __importDefault(require('lodash/set'));
const split_1 = __importDefault(require('lodash/split'));
const n8n_workflow_1 = require('n8n-workflow');
const pkce_challenge_1 = __importDefault(require('pkce-challenge'));
const qs = __importStar(require('querystring'));
const constants_1 = require('@/constants');
const abstract_oauth_controller_1 = require('./abstract-oauth.controller');
let OAuth2CredentialController = class OAuth2CredentialController extends abstract_oauth_controller_1.AbstractOAuthController {
	constructor() {
		super(...arguments);
		this.oauthVersion = 2;
	}
	async getAuthUri(req) {
		const credential = await this.getCredential(req);
		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedDataForAuthUri(credential, additionalData);
		if (
			decryptedDataOriginal?.scope &&
			credential.type.includes('OAuth2') &&
			!constants_1.GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE.includes(credential.type)
		) {
			delete decryptedDataOriginal.scope;
		}
		const oauthCredentials = await this.applyDefaultsAndOverwrites(
			credential,
			decryptedDataOriginal,
			additionalData,
		);
		const [csrfSecret, state] = this.createCsrfState(
			credential.id,
			abstract_oauth_controller_1.skipAuthOnOAuthCallback ? undefined : req.user.id,
		);
		const oAuthOptions = {
			...this.convertCredentialToOptions(oauthCredentials),
			state,
		};
		if (oauthCredentials.authQueryParameters) {
			oAuthOptions.query = qs.parse(oauthCredentials.authQueryParameters);
		}
		await this.externalHooks.run('oauth2.authenticate', [oAuthOptions]);
		const toUpdate = { csrfSecret };
		if (oauthCredentials.grantType === 'pkce') {
			const { code_verifier, code_challenge } = await (0, pkce_challenge_1.default)();
			oAuthOptions.query = {
				...oAuthOptions.query,
				code_challenge,
				code_challenge_method: 'S256',
			};
			toUpdate.codeVerifier = code_verifier;
		}
		await this.encryptAndSaveData(credential, toUpdate);
		const oAuthObj = new client_oauth2_1.ClientOAuth2(oAuthOptions);
		const returnUri = oAuthObj.code.getUri();
		this.logger.debug('OAuth2 authorization url created for credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});
		return returnUri.toString();
	}
	async handleCallback(req, res) {
		try {
			const { code, state: encodedState } = req.query;
			if (!code || !encodedState) {
				return this.renderCallbackError(
					res,
					'Insufficient parameters for OAuth2 callback.',
					`Received following query parameters: ${JSON.stringify(req.query)}`,
				);
			}
			const [credential, decryptedDataOriginal, oauthCredentials] =
				await this.resolveCredential(req);
			let options = {};
			const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);
			if (oauthCredentials.grantType === 'pkce') {
				options = {
					body: { code_verifier: decryptedDataOriginal.codeVerifier },
				};
			} else if (oauthCredentials.authentication === 'body') {
				options = {
					body: {
						...(oAuthOptions.body ?? {}),
						client_id: oAuthOptions.clientId,
						client_secret: oAuthOptions.clientSecret,
					},
				};
				delete oAuthOptions.clientSecret;
			}
			await this.externalHooks.run('oauth2.callback', [oAuthOptions]);
			const oAuthObj = new client_oauth2_1.ClientOAuth2(oAuthOptions);
			const queryParameters = req.originalUrl.split('?').splice(1, 1).join('');
			const oauthToken = await oAuthObj.code.getToken(
				`${oAuthOptions.redirectUri}?${queryParameters}`,
				options,
			);
			if (Object.keys(req.query).length > 2) {
				(0, set_1.default)(
					oauthToken.data,
					'callbackQueryString',
					(0, omit_1.default)(req.query, 'state', 'code'),
				);
			}
			let { oauthTokenData } = decryptedDataOriginal;
			oauthTokenData = {
				...(typeof oauthTokenData === 'object' ? oauthTokenData : {}),
				...oauthToken.data,
			};
			await this.encryptAndSaveData(credential, { oauthTokenData }, ['csrfSecret']);
			this.logger.debug('OAuth2 callback successful for credential', {
				credentialId: credential.id,
			});
			return res.render('oauth-callback');
		} catch (e) {
			const error = (0, n8n_workflow_1.ensureError)(e);
			return this.renderCallbackError(
				res,
				error.message,
				'body' in error ? (0, n8n_workflow_1.jsonStringify)(error.body) : undefined,
			);
		}
	}
	async refreshToken(req) {
		try {
			const credential = await this.getCredential(req);
			const additionalData = await this.getAdditionalData();
			const decryptedData = await this.getDecryptedDataForCallback(credential, additionalData);
			if (!decryptedData.oauthTokenData) {
				return {
					success: false,
					message: 'No OAuth token data found. Please re-authenticate.',
				};
			}
			const tokenData = decryptedData.oauthTokenData;
			if (!tokenData.refresh_token) {
				return {
					success: false,
					message: 'No refresh token available. Please re-authenticate.',
				};
			}
			const oauthCredentials = await this.applyDefaultsAndOverwrites(
				credential,
				decryptedData,
				additionalData,
			);
			const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);
			const oAuthObj = new client_oauth2_1.ClientOAuth2(oAuthOptions);
			const existingToken = new client_oauth2_1.ClientOAuth2Token(oAuthObj, tokenData);
			if (!existingToken.expired()) {
				const expiresAt = new Date(Date.now() + parseInt(tokenData.expires_in || '3600') * 1000);
				return {
					success: true,
					message: 'Token is still valid',
					tokenData: {
						access_token: tokenData.access_token,
						token_type: tokenData.token_type,
						expires_in: tokenData.expires_in,
					},
					expiresAt: expiresAt.toISOString(),
				};
			}
			const refreshedToken = await existingToken.refresh();
			const newTokenData = {
				...tokenData,
				...refreshedToken.data,
			};
			await this.encryptAndSaveData(credential, { oauthTokenData: newTokenData });
			this.logger.debug('OAuth2 token refreshed successfully', {
				userId: req.user.id,
				credentialId: credential.id,
			});
			const expiresAt = new Date(
				Date.now() + parseInt(refreshedToken.data.expires_in || '3600') * 1000,
			);
			return {
				success: true,
				message: 'Token refreshed successfully',
				tokenData: {
					access_token: refreshedToken.data.access_token,
					token_type: refreshedToken.data.token_type,
					expires_in: refreshedToken.data.expires_in,
				},
				expiresAt: expiresAt.toISOString(),
			};
		} catch (error) {
			this.logger.error('OAuth2 token refresh failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				success: false,
				message: error instanceof Error ? error.message : 'Token refresh failed',
			};
		}
	}
	async getTokenStatus(req) {
		try {
			const credential = await this.getCredential(req);
			const additionalData = await this.getAdditionalData();
			const decryptedData = await this.getDecryptedDataForCallback(credential, additionalData);
			if (!decryptedData.oauthTokenData) {
				return {
					isValid: false,
					isExpired: true,
					hasRefreshToken: false,
					message: 'No OAuth token data found',
				};
			}
			const tokenData = decryptedData.oauthTokenData;
			const hasRefreshToken = !!tokenData.refresh_token;
			if (!tokenData.access_token) {
				return {
					isValid: false,
					isExpired: true,
					hasRefreshToken,
					message: 'No access token found',
				};
			}
			const oauthCredentials = await this.applyDefaultsAndOverwrites(
				credential,
				decryptedData,
				additionalData,
			);
			const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);
			const oAuthObj = new client_oauth2_1.ClientOAuth2(oAuthOptions);
			const token = new client_oauth2_1.ClientOAuth2Token(oAuthObj, tokenData);
			const isExpired = token.expired();
			const expiresAt = tokenData.expires_in
				? new Date(Date.now() + parseInt(tokenData.expires_in) * 1000).toISOString()
				: undefined;
			this.logger.debug('OAuth2 token status checked', {
				userId: req.user.id,
				credentialId: credential.id,
				isExpired,
				hasRefreshToken,
			});
			return {
				isValid: !isExpired,
				isExpired,
				expiresAt,
				hasRefreshToken,
				scope: tokenData.scope,
				tokenType: tokenData.token_type,
				message: isExpired
					? hasRefreshToken
						? 'Token expired but can be refreshed'
						: 'Token expired and no refresh token available'
					: 'Token is valid',
			};
		} catch (error) {
			this.logger.error('OAuth2 token status check failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				isValid: false,
				isExpired: true,
				hasRefreshToken: false,
				message: error instanceof Error ? error.message : 'Status check failed',
			};
		}
	}
	async completeCredentialFlow(req) {
		try {
			const credential = await this.getCredential(req);
			const additionalData = await this.getAdditionalData();
			const decryptedData = await this.getDecryptedDataForCallback(credential, additionalData);
			if (!decryptedData.oauthTokenData) {
				return {
					success: false,
					message: 'OAuth flow not completed. No token data found.',
					credentialId: credential.id,
				};
			}
			const tokenData = decryptedData.oauthTokenData;
			if (!tokenData.access_token) {
				return {
					success: false,
					message: 'OAuth flow incomplete. No access token found.',
					credentialId: credential.id,
				};
			}
			const tokenStatus = await this.getTokenStatus(req);
			const cleanupData = ['csrfSecret', 'codeVerifier'];
			await this.encryptAndSaveData(credential, {}, cleanupData);
			await this.externalHooks.run('oauth2.complete', [
				{
					credentialId: credential.id,
					userId: req.user.id,
					tokenData: {
						hasAccessToken: !!tokenData.access_token,
						hasRefreshToken: !!tokenData.refresh_token,
						tokenType: tokenData.token_type,
						scope: tokenData.scope,
					},
				},
			]);
			this.logger.info('OAuth2 credential flow completed successfully', {
				userId: req.user.id,
				credentialId: credential.id,
				hasRefreshToken: !!tokenData.refresh_token,
			});
			return {
				success: true,
				message: 'OAuth2 credential flow completed successfully',
				credentialId: credential.id,
				tokenStatus,
				flowMetadata: {
					completedAt: new Date().toISOString(),
					hasRefreshToken: !!tokenData.refresh_token,
					scope: tokenData.scope,
					tokenType: tokenData.token_type,
				},
			};
		} catch (error) {
			this.logger.error('OAuth2 credential flow completion failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				success: false,
				message: error instanceof Error ? error.message : 'Flow completion failed',
				credentialId: req.query.id,
			};
		}
	}
	async revokeToken(req) {
		try {
			const credential = await this.getCredential(req);
			const additionalData = await this.getAdditionalData();
			const decryptedData = await this.getDecryptedDataForCallback(credential, additionalData);
			if (!decryptedData.oauthTokenData) {
				return {
					success: false,
					message: 'No OAuth token data found to revoke',
					revokedTokens: [],
				};
			}
			const tokenData = decryptedData.oauthTokenData;
			const revokedTokens = [];
			const oauthCredentials = await this.applyDefaultsAndOverwrites(
				credential,
				decryptedData,
				additionalData,
			);
			if (oauthCredentials.revokeTokenUrl) {
				const oAuthOptions = this.convertCredentialToOptions(oauthCredentials);
				const oAuthObj = new client_oauth2_1.ClientOAuth2(oAuthOptions);
				if (tokenData.refresh_token) {
					try {
						const token = new client_oauth2_1.ClientOAuth2Token(oAuthObj, tokenData);
						await this.makeRevocationRequest(
							oauthCredentials.revokeTokenUrl,
							tokenData.refresh_token,
							oAuthOptions,
						);
						revokedTokens.push('refresh_token');
					} catch (error) {
						this.logger.warn('Failed to revoke refresh token at provider', {
							credentialId: credential.id,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}
				if (tokenData.access_token) {
					try {
						await this.makeRevocationRequest(
							oauthCredentials.revokeTokenUrl,
							tokenData.access_token,
							oAuthOptions,
						);
						revokedTokens.push('access_token');
					} catch (error) {
						this.logger.warn('Failed to revoke access token at provider', {
							credentialId: credential.id,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}
			}
			await this.encryptAndSaveData(credential, {}, [
				'oauthTokenData',
				'csrfSecret',
				'codeVerifier',
			]);
			await this.externalHooks.run('oauth2.revoke', [
				{
					credentialId: credential.id,
					userId: req.user.id,
					revokedTokens,
				},
			]);
			this.logger.info('OAuth2 tokens revoked successfully', {
				userId: req.user.id,
				credentialId: credential.id,
				revokedTokens,
			});
			return {
				success: true,
				message: `OAuth2 tokens revoked successfully. ${revokedTokens.length > 0 ? 'Provider notified.' : 'Local tokens cleared.'}`,
				revokedTokens,
			};
		} catch (error) {
			this.logger.error('OAuth2 token revocation failed', {
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				success: false,
				message: error instanceof Error ? error.message : 'Token revocation failed',
				revokedTokens: [],
			};
		}
	}
	async makeRevocationRequest(revokeUrl, token, oAuthOptions) {
		const { default: axios } = await Promise.resolve().then(() => __importStar(require('axios')));
		const headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
		};
		const body = new URLSearchParams({
			token,
			token_type_hint: token.includes('refresh') ? 'refresh_token' : 'access_token',
		});
		if (oAuthOptions.authentication === 'body') {
			body.append('client_id', oAuthOptions.clientId);
			body.append('client_secret', oAuthOptions.clientSecret);
		} else {
			const auth = Buffer.from(`${oAuthOptions.clientId}:${oAuthOptions.clientSecret}`).toString(
				'base64',
			);
			headers.Authorization = `Basic ${auth}`;
		}
		await axios.post(revokeUrl, body.toString(), {
			headers,
			timeout: 10000,
		});
	}
	convertCredentialToOptions(credential) {
		const options = {
			clientId: credential.clientId,
			clientSecret: credential.clientSecret ?? '',
			accessTokenUri: credential.accessTokenUrl ?? '',
			authorizationUri: credential.authUrl ?? '',
			authentication: credential.authentication ?? 'header',
			redirectUri: `${this.baseUrl}/callback`,
			scopes: (0, split_1.default)(credential.scope ?? 'openid', ','),
			scopesSeparator: credential.scope?.includes(',') ? ',' : ' ',
			ignoreSSLIssues: credential.ignoreSSLIssues ?? false,
		};
		if (
			credential.additionalBodyProperties &&
			typeof credential.additionalBodyProperties === 'string'
		) {
			const parsedBody = (0, n8n_workflow_1.jsonParse)(credential.additionalBodyProperties);
			if (parsedBody) {
				options.body = parsedBody;
			}
		}
		return options;
	}
};
exports.OAuth2CredentialController = OAuth2CredentialController;
__decorate(
	[
		(0, decorators_1.Get)('/auth'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	OAuth2CredentialController.prototype,
	'getAuthUri',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/callback', {
			usesTemplates: true,
			skipAuth: abstract_oauth_controller_1.skipAuthOnOAuthCallback,
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	OAuth2CredentialController.prototype,
	'handleCallback',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/refresh'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	OAuth2CredentialController.prototype,
	'refreshToken',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/status'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	OAuth2CredentialController.prototype,
	'getTokenStatus',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/complete'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	OAuth2CredentialController.prototype,
	'completeCredentialFlow',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/revoke'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	OAuth2CredentialController.prototype,
	'revokeToken',
	null,
);
exports.OAuth2CredentialController = OAuth2CredentialController = __decorate(
	[(0, decorators_1.RestController)('/oauth2-credential')],
	OAuth2CredentialController,
);
//# sourceMappingURL=oauth2-credential.controller.js.map
