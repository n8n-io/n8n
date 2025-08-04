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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ApiKeysController = exports.isApiEnabledMiddleware = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const permissions_1 = require('@n8n/permissions');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const event_service_1 = require('@/events/event.service');
const public_api_1 = require('@/public-api');
const public_api_key_service_1 = require('@/services/public-api-key.service');
const isApiEnabledMiddleware = (_, res, next) => {
	if ((0, public_api_1.isApiEnabled)()) {
		next();
	} else {
		res.status(404).end();
	}
};
exports.isApiEnabledMiddleware = isApiEnabledMiddleware;
let ApiKeysController = class ApiKeysController {
	constructor(eventService, publicApiKeyService) {
		this.eventService = eventService;
		this.publicApiKeyService = publicApiKeyService;
	}
	async createApiKey(req, _res, body) {
		if (!this.publicApiKeyService.apiKeyHasValidScopesForRole(req.user.role, body.scopes)) {
			throw new bad_request_error_1.BadRequestError('Invalid scopes for user role');
		}
		const newApiKey = await this.publicApiKeyService.createPublicApiKeyForUser(req.user, body);
		this.eventService.emit('public-api-key-created', { user: req.user, publicApi: false });
		return {
			...newApiKey,
			apiKey: this.publicApiKeyService.redactApiKey(newApiKey.apiKey),
			rawApiKey: newApiKey.apiKey,
			expiresAt: body.expiresAt,
		};
	}
	async getApiKeys(req) {
		const apiKeys = await this.publicApiKeyService.getRedactedApiKeysForUser(req.user);
		return apiKeys;
	}
	async deleteApiKey(req, _res, apiKeyId) {
		await this.publicApiKeyService.deleteApiKeyForUser(req.user, apiKeyId);
		this.eventService.emit('public-api-key-deleted', { user: req.user, publicApi: false });
		return { success: true };
	}
	async updateApiKey(req, _res, apiKeyId, body) {
		if (!this.publicApiKeyService.apiKeyHasValidScopesForRole(req.user.role, body.scopes)) {
			throw new bad_request_error_1.BadRequestError('Invalid scopes for user role');
		}
		await this.publicApiKeyService.updateApiKeyForUser(req.user, apiKeyId, body);
		return { success: true };
	}
	async getApiKeyScopes(req, _res) {
		const { role } = req.user;
		const scopes = (0, permissions_1.getApiKeyScopesForRole)(role);
		return scopes;
	}
};
exports.ApiKeysController = ApiKeysController;
__decorate(
	[
		(0, decorators_1.Post)('/', { middlewares: [exports.isApiEnabledMiddleware] }),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, api_types_1.CreateApiKeyRequestDto]),
		__metadata('design:returntype', Promise),
	],
	ApiKeysController.prototype,
	'createApiKey',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/', { middlewares: [exports.isApiEnabledMiddleware] }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ApiKeysController.prototype,
	'getApiKeys',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:id', { middlewares: [exports.isApiEnabledMiddleware] }),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, String]),
		__metadata('design:returntype', Promise),
	],
	ApiKeysController.prototype,
	'deleteApiKey',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:id', { middlewares: [exports.isApiEnabledMiddleware] }),
		__param(2, (0, decorators_1.Param)('id')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, String, api_types_1.UpdateApiKeyRequestDto]),
		__metadata('design:returntype', Promise),
	],
	ApiKeysController.prototype,
	'updateApiKey',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/scopes', { middlewares: [exports.isApiEnabledMiddleware] }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response]),
		__metadata('design:returntype', Promise),
	],
	ApiKeysController.prototype,
	'getApiKeyScopes',
	null,
);
exports.ApiKeysController = ApiKeysController = __decorate(
	[
		(0, decorators_1.RestController)('/api-keys'),
		__metadata('design:paramtypes', [
			event_service_1.EventService,
			public_api_key_service_1.PublicApiKeyService,
		]),
	],
	ApiKeysController,
);
//# sourceMappingURL=api-keys.controller.js.map
