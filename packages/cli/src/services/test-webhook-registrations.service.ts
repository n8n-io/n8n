import { Service } from 'typedi';
import { CacheService } from './cache.service';
import { ApplicationError, type IWebhookData } from 'n8n-workflow';
import type { WebhookRegistration } from '../Interfaces';

const CACHE_KEY = 'test-webhook';

@Service()
export class TestWebhookRegistrationsService {
	constructor(private readonly cacheService: CacheService) {}

	async register(registration: WebhookRegistration) {
		const key = this.toKey(registration.webhook);

		await this.cacheService.set(key, registration);
	}

	async deregister(arg: IWebhookData | string) {
		if (typeof arg === 'string') {
			await this.cacheService.delete(arg);
		} else {
			const key = this.toKey(arg);
			await this.cacheService.delete(key);
		}
	}

	async exists(key: string) {
		const registration = await this.cacheService.get<WebhookRegistration>(key);

		return registration !== undefined; // @TODO: cacheService.has()?
	}

	async get(key: string) {
		const registration = await this.cacheService.get<WebhookRegistration>(key);

		if (!registration) {
			throw new ApplicationError('Failed to find test webhook registration', { extra: { key } });
		}

		return registration;
	}

	async getAllKeys() {
		const keys = await this.cacheService.keys();

		return keys.filter((key) => key.startsWith(CACHE_KEY));
	}

	async getAllValues() {
		const keys = await this.getAllKeys();

		return this.cacheService.getMany<WebhookRegistration>(keys);
	}

	async updateWebhookProperties(newProperties: IWebhookData) {
		const key = this.toKey(newProperties);

		const registration = await this.cacheService.get<WebhookRegistration>(key);

		if (!registration) {
			throw new ApplicationError('Failed to find test webhook registration', { extra: { key } });
		}

		registration.webhook = newProperties;

		await this.cacheService.set(key, registration);
	}

	async deregisterAll() {
		const testWebhookKeys = await this.getAllKeys();

		await this.cacheService.deleteMany(testWebhookKeys);
	}

	toKey(webhook: Pick<IWebhookData, 'webhookId' | 'httpMethod' | 'path'>) {
		const { webhookId, httpMethod, path: webhookPath } = webhook;

		if (!webhookId) return `${CACHE_KEY}:${httpMethod}|${webhookPath}`;

		let path = webhookPath;

		if (path.startsWith(webhookId)) {
			const cutFromIndex = path.indexOf('/') + 1;

			path = path.slice(cutFromIndex);
		}

		return `${CACHE_KEY}:${httpMethod}|${webhookId}|${path.split('/').length}`;
	}
}
