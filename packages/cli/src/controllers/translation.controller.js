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
exports.TranslationController =
	exports.NODE_HEADERS_PATH =
	exports.CREDENTIAL_TRANSLATIONS_DIR =
		void 0;
const config_1 = require('@n8n/config');
const decorators_1 = require('@n8n/decorators');
const promises_1 = require('fs/promises');
const path_1 = require('path');
const constants_1 = require('@/constants');
const credential_types_1 = require('@/credential-types');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
exports.CREDENTIAL_TRANSLATIONS_DIR = 'n8n-nodes-base/dist/credentials/translations';
exports.NODE_HEADERS_PATH = (0, path_1.join)(constants_1.NODES_BASE_DIR, 'dist/nodes/headers');
let TranslationController = class TranslationController {
	constructor(credentialTypes, globalConfig) {
		this.credentialTypes = credentialTypes;
		this.globalConfig = globalConfig;
	}
	async getCredentialTranslation(req) {
		const { credentialType } = req.query;
		if (!this.credentialTypes.recognizes(credentialType))
			throw new bad_request_error_1.BadRequestError(`Invalid Credential type: "${credentialType}"`);
		const { defaultLocale } = this.globalConfig;
		const translationPath = (0, path_1.join)(
			exports.CREDENTIAL_TRANSLATIONS_DIR,
			defaultLocale,
			`${credentialType}.json`,
		);
		try {
			return require(translationPath);
		} catch (error) {
			return null;
		}
	}
	async getNodeTranslationHeaders() {
		try {
			await (0, promises_1.access)(`${exports.NODE_HEADERS_PATH}.js`);
		} catch {
			return;
		}
		try {
			return require(exports.NODE_HEADERS_PATH);
		} catch (error) {
			throw new internal_server_error_1.InternalServerError('Failed to load headers file', error);
		}
	}
};
exports.TranslationController = TranslationController;
__decorate(
	[
		(0, decorators_1.Get)('/credential-translation'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	TranslationController.prototype,
	'getCredentialTranslation',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/node-translation-headers'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	TranslationController.prototype,
	'getNodeTranslationHeaders',
	null,
);
exports.TranslationController = TranslationController = __decorate(
	[
		(0, decorators_1.RestController)('/'),
		__metadata('design:paramtypes', [credential_types_1.CredentialTypes, config_1.GlobalConfig]),
	],
	TranslationController,
);
//# sourceMappingURL=translation.controller.js.map
