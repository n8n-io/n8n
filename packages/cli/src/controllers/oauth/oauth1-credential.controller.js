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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.OAuth1CredentialController = void 0;
const decorators_1 = require('@n8n/decorators');
const axios_1 = __importDefault(require('axios'));
const crypto_1 = require('crypto');
const n8n_workflow_1 = require('n8n-workflow');
const oauth_1_0a_1 = __importDefault(require('oauth-1.0a'));
const abstract_oauth_controller_1 = require('./abstract-oauth.controller');
const algorithmMap = {
	'HMAC-SHA256': 'sha256',
	'HMAC-SHA512': 'sha512',
	'HMAC-SHA1': 'sha1',
};
let OAuth1CredentialController = class OAuth1CredentialController extends abstract_oauth_controller_1.AbstractOAuthController {
	constructor() {
		super(...arguments);
		this.oauthVersion = 1;
	}
	async getAuthUri(req) {
		const credential = await this.getCredential(req);
		const additionalData = await this.getAdditionalData();
		const decryptedDataOriginal = await this.getDecryptedDataForAuthUri(credential, additionalData);
		const oauthCredentials = await this.applyDefaultsAndOverwrites(
			credential,
			decryptedDataOriginal,
			additionalData,
		);
		const [csrfSecret, state] = this.createCsrfState(
			credential.id,
			abstract_oauth_controller_1.skipAuthOnOAuthCallback ? undefined : req.user.id,
		);
		const signatureMethod = oauthCredentials.signatureMethod;
		const oAuthOptions = {
			consumer: {
				key: oauthCredentials.consumerKey,
				secret: oauthCredentials.consumerSecret,
			},
			signature_method: signatureMethod,
			hash_function(base, key) {
				const algorithm = algorithmMap[signatureMethod] ?? 'sha1';
				return (0, crypto_1.createHmac)(algorithm, key).update(base).digest('base64');
			},
		};
		const oauthRequestData = {
			oauth_callback: `${this.baseUrl}/callback?state=${state}`,
		};
		await this.externalHooks.run('oauth1.authenticate', [oAuthOptions, oauthRequestData]);
		const oauth = new oauth_1_0a_1.default(oAuthOptions);
		const options = {
			method: 'POST',
			url: oauthCredentials.requestTokenUrl,
			data: oauthRequestData,
		};
		const data = oauth.toHeader(oauth.authorize(options));
		options.headers = data;
		const { data: response } = await axios_1.default.request(options);
		const paramsParser = new URLSearchParams(response);
		const responseJson = Object.fromEntries(paramsParser.entries());
		const returnUri = `${oauthCredentials.authUrl}?oauth_token=${responseJson.oauth_token}`;
		await this.encryptAndSaveData(credential, { csrfSecret });
		this.logger.debug('OAuth1 authorization successful for new credential', {
			userId: req.user.id,
			credentialId: credential.id,
		});
		return returnUri;
	}
	async handleCallback(req, res) {
		try {
			const { oauth_verifier, oauth_token, state: encodedState } = req.query;
			if (!oauth_verifier || !oauth_token || !encodedState) {
				return this.renderCallbackError(
					res,
					'Insufficient parameters for OAuth1 callback.',
					`Received following query parameters: ${JSON.stringify(req.query)}`,
				);
			}
			const [credential, _, oauthCredentials] = await this.resolveCredential(req);
			const oauthToken = await axios_1.default.post(
				oauthCredentials.accessTokenUrl,
				{ oauth_token, oauth_verifier },
				{ headers: { 'content-type': 'application/x-www-form-urlencoded' } },
			);
			const paramParser = new URLSearchParams(oauthToken.data);
			const oauthTokenData = Object.fromEntries(paramParser.entries());
			await this.encryptAndSaveData(credential, { oauthTokenData }, ['csrfSecret']);
			this.logger.debug('OAuth1 callback successful for new credential', {
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
};
exports.OAuth1CredentialController = OAuth1CredentialController;
__decorate(
	[
		(0, decorators_1.Get)('/auth'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	OAuth1CredentialController.prototype,
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
	OAuth1CredentialController.prototype,
	'handleCallback',
	null,
);
exports.OAuth1CredentialController = OAuth1CredentialController = __decorate(
	[(0, decorators_1.RestController)('/oauth1-credential')],
	OAuth1CredentialController,
);
//# sourceMappingURL=oauth1-credential.controller.js.map
