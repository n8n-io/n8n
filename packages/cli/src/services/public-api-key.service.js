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
exports.PublicApiKeyService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const jsonwebtoken_1 = require('jsonwebtoken');
const event_service_1 = require('@/events/event.service');
const jwt_service_1 = require('./jwt.service');
const last_active_at_service_1 = require('./last-active-at.service');
const API_KEY_AUDIENCE = 'public-api';
const API_KEY_ISSUER = 'n8n';
const REDACT_API_KEY_REVEAL_COUNT = 4;
const REDACT_API_KEY_MAX_LENGTH = 10;
const PREFIX_LEGACY_API_KEY = 'n8n_api_';
let PublicApiKeyService = class PublicApiKeyService {
	constructor(apiKeyRepository, userRepository, jwtService, eventService, lastActiveAtService) {
		this.apiKeyRepository = apiKeyRepository;
		this.userRepository = userRepository;
		this.jwtService = jwtService;
		this.eventService = eventService;
		this.lastActiveAtService = lastActiveAtService;
		this.getApiKeyExpiration = (apiKey) => {
			const decoded = this.jwtService.decode(apiKey);
			return decoded?.exp ?? null;
		};
	}
	async createPublicApiKeyForUser(user, { label, expiresAt, scopes }) {
		const apiKey = this.generateApiKey(user, expiresAt);
		await this.apiKeyRepository.insert(
			this.apiKeyRepository.create({
				userId: user.id,
				apiKey,
				label,
				scopes,
			}),
		);
		return await this.apiKeyRepository.findOneByOrFail({ apiKey });
	}
	async getRedactedApiKeysForUser(user) {
		const apiKeys = await this.apiKeyRepository.findBy({ userId: user.id });
		return apiKeys.map((apiKeyRecord) => ({
			...apiKeyRecord,
			apiKey: this.redactApiKey(apiKeyRecord.apiKey),
			expiresAt: this.getApiKeyExpiration(apiKeyRecord.apiKey),
		}));
	}
	async deleteApiKeyForUser(user, apiKeyId) {
		await this.apiKeyRepository.delete({ userId: user.id, id: apiKeyId });
	}
	async updateApiKeyForUser(user, apiKeyId, { label, scopes }) {
		await this.apiKeyRepository.update({ id: apiKeyId, userId: user.id }, { label, scopes });
	}
	async getUserForApiKey(apiKey) {
		return await this.userRepository
			.createQueryBuilder('user')
			.innerJoin(db_1.ApiKey, 'apiKey', 'apiKey.userId = user.id')
			.where('apiKey.apiKey = :apiKey', { apiKey })
			.select('user')
			.getOne();
	}
	redactApiKey(apiKey) {
		const visiblePart = apiKey.slice(-REDACT_API_KEY_REVEAL_COUNT);
		const redactedPart = '*'.repeat(
			Math.max(0, REDACT_API_KEY_MAX_LENGTH - REDACT_API_KEY_REVEAL_COUNT),
		);
		return redactedPart + visiblePart;
	}
	getAuthMiddleware(version) {
		return async (req, _scopes, schema) => {
			const providedApiKey = req.headers[schema.name.toLowerCase()];
			const user = await this.getUserForApiKey(providedApiKey);
			if (!user) return false;
			if (!providedApiKey.startsWith(PREFIX_LEGACY_API_KEY)) {
				try {
					this.jwtService.verify(providedApiKey, {
						issuer: API_KEY_ISSUER,
						audience: API_KEY_AUDIENCE,
					});
				} catch (e) {
					if (e instanceof jsonwebtoken_1.TokenExpiredError) return false;
					throw e;
				}
			}
			this.eventService.emit('public-api-invoked', {
				userId: user.id,
				path: req.path,
				method: req.method,
				apiVersion: version,
			});
			req.user = user;
			void this.lastActiveAtService.updateLastActiveIfStale(user.id);
			return true;
		};
	}
	generateApiKey(user, expiresAt) {
		const nowInSeconds = Math.floor(Date.now() / 1000);
		return this.jwtService.sign(
			{ sub: user.id, iss: API_KEY_ISSUER, aud: API_KEY_AUDIENCE },
			{ ...(expiresAt && { expiresIn: expiresAt - nowInSeconds }) },
		);
	}
	apiKeyHasValidScopesForRole(role, apiKeyScopes) {
		const scopesForRole = (0, permissions_1.getApiKeyScopesForRole)(role);
		return apiKeyScopes.every((scope) => scopesForRole.includes(scope));
	}
	async apiKeyHasValidScopes(apiKey, endpointScope) {
		const apiKeyData = await this.apiKeyRepository.findOne({
			where: { apiKey },
			select: { scopes: true },
		});
		if (!apiKeyData) return false;
		return apiKeyData.scopes.includes(endpointScope);
	}
	getApiKeyScopeMiddleware(endpointScope) {
		return async (req, res, next) => {
			const apiKey = req.headers['x-n8n-api-key'];
			if (apiKey === undefined || typeof apiKey !== 'string') {
				res.status(401).json({ message: 'Unauthorized' });
				return;
			}
			const valid = await this.apiKeyHasValidScopes(apiKey, endpointScope);
			if (!valid) {
				res.status(403).json({ message: 'Forbidden' });
				return;
			}
			next();
		};
	}
	async removeOwnerOnlyScopesFromApiKeys(user, tx) {
		const manager = tx ?? this.apiKeyRepository.manager;
		const ownerOnlyScopes = (0, permissions_1.getOwnerOnlyApiKeyScopes)();
		const userApiKeys = await manager.find(db_1.ApiKey, {
			where: { userId: user.id },
		});
		const keysWithOwnerScopes = userApiKeys.filter((apiKey) =>
			apiKey.scopes.some((scope) => ownerOnlyScopes.includes(scope)),
		);
		return await Promise.all(
			keysWithOwnerScopes.map(
				async (currentApiKey) =>
					await manager.update(db_1.ApiKey, currentApiKey.id, {
						scopes: currentApiKey.scopes.filter((scope) => !ownerOnlyScopes.includes(scope)),
					}),
			),
		);
	}
};
exports.PublicApiKeyService = PublicApiKeyService;
exports.PublicApiKeyService = PublicApiKeyService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.ApiKeyRepository,
			db_1.UserRepository,
			jwt_service_1.JwtService,
			event_service_1.EventService,
			last_active_at_service_1.LastActiveAtService,
		]),
	],
	PublicApiKeyService,
);
//# sourceMappingURL=public-api-key.service.js.map
