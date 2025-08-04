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
exports.TestWebhookRegistrationsService = void 0;
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const constants_1 = require('@/constants');
const cache_service_1 = require('@/services/cache/cache.service');
let TestWebhookRegistrationsService = class TestWebhookRegistrationsService {
	constructor(cacheService, instanceSettings) {
		this.cacheService = cacheService;
		this.instanceSettings = instanceSettings;
		this.cacheKey = 'test-webhooks';
	}
	async register(registration) {
		const hashKey = this.toKey(registration.webhook);
		await this.cacheService.setHash(this.cacheKey, { [hashKey]: registration });
		if (this.instanceSettings.isSingleMain) return;
		const ttl = constants_1.TEST_WEBHOOK_TIMEOUT + constants_1.TEST_WEBHOOK_TIMEOUT_BUFFER;
		await this.cacheService.expire(this.cacheKey, ttl);
	}
	async deregister(arg) {
		if (typeof arg === 'string') {
			await this.cacheService.deleteFromHash(this.cacheKey, arg);
		} else {
			const hashKey = this.toKey(arg);
			await this.cacheService.deleteFromHash(this.cacheKey, hashKey);
		}
	}
	async get(key) {
		return await this.cacheService.getHashValue(this.cacheKey, key);
	}
	async getAllKeys() {
		const hash = await this.cacheService.getHash(this.cacheKey);
		if (!hash) return [];
		return Object.keys(hash);
	}
	async getAllRegistrations() {
		const hash = await this.cacheService.getHash(this.cacheKey);
		if (!hash) return [];
		return Object.values(hash);
	}
	async deregisterAll() {
		await this.cacheService.delete(this.cacheKey);
	}
	toKey(webhook) {
		const { webhookId, httpMethod, path: webhookPath } = webhook;
		if (!webhookId) return [httpMethod, webhookPath].join('|');
		let path = webhookPath;
		if (path.startsWith(webhookId)) {
			const cutFromIndex = path.indexOf('/') + 1;
			path = path.slice(cutFromIndex);
		}
		return [httpMethod, webhookId, path.split('/').length].join('|');
	}
};
exports.TestWebhookRegistrationsService = TestWebhookRegistrationsService;
exports.TestWebhookRegistrationsService = TestWebhookRegistrationsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [cache_service_1.CacheService, n8n_core_1.InstanceSettings]),
	],
	TestWebhookRegistrationsService,
);
//# sourceMappingURL=test-webhook-registrations.service.js.map
