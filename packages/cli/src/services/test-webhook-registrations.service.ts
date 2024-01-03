import { Service } from 'typedi';
import { CacheService } from './cache.service';
import { ApplicationError, type IWebhookData } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interfaces';

export type TestWebhookRegistration = {
	sessionId?: string;
	workflowEntity: IWorkflowDb;
	destinationNode?: string;
	webhook: IWebhookData;
};

@Service()
export class TestWebhookRegistrationsService {
	constructor(private readonly cacheService: CacheService) {}

	private readonly cacheKey = 'test-webhook';

	async register(registration: TestWebhookRegistration) {
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

	async get(key: string) {
		return this.cacheService.get<TestWebhookRegistration>(key);
	}

	async getAllKeys() {
		const keys = await this.cacheService.keys();

		if (this.cacheService.isMemoryCache()) {
			return keys.filter((key) => key.startsWith(this.cacheKey));
		}

		const prefix = 'n8n:cache'; // prepended by Redis cache
		const extendedCacheKey = `${prefix}:${this.cacheKey}`;

		return keys
			.filter((key) => key.startsWith(extendedCacheKey))
			.map((key) => key.slice(`${prefix}:`.length));
	}

	async getAllRegistrations() {
		const keys = await this.getAllKeys();

		return this.cacheService.getMany<TestWebhookRegistration>(keys);
	}

	async updateWebhookProperties(newProperties: IWebhookData) {
		const key = this.toKey(newProperties);

		const registration = await this.cacheService.get<TestWebhookRegistration>(key);

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

		if (!webhookId) return `${this.cacheKey}:${httpMethod}|${webhookPath}`;

		let path = webhookPath;

		if (path.startsWith(webhookId)) {
			const cutFromIndex = path.indexOf('/') + 1;

			path = path.slice(cutFromIndex);
		}

		return `${this.cacheKey}:${httpMethod}|${webhookId}|${path.split('/').length}`;
	}
}
