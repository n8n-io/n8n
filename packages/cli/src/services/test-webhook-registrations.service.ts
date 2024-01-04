import { Service } from 'typedi';
import { CacheService } from '@/services/cache/cache.service';
import { type IWebhookData } from 'n8n-workflow';
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

	private readonly cacheKey = 'test-webhooks';

	async register(registration: TestWebhookRegistration) {
		const hashKey = this.toKey(registration.webhook);

		await this.cacheService.setHash(this.cacheKey, { [hashKey]: registration });
	}

	async deregister(arg: IWebhookData | string) {
		if (typeof arg === 'string') {
			await this.cacheService.deleteFromHash(this.cacheKey, arg);
		} else {
			const hashKey = this.toKey(arg);
			await this.cacheService.deleteFromHash(this.cacheKey, hashKey);
		}
	}

	async get(key: string) {
		return this.cacheService.getHashValue<TestWebhookRegistration>(this.cacheKey, key);
	}

	async getAllKeys() {
		const hash = await this.cacheService.getHash<TestWebhookRegistration>(this.cacheKey);

		if (!hash) return [];

		return Object.keys(hash);
	}

	async getAllRegistrations() {
		const hash = await this.cacheService.getHash<TestWebhookRegistration>(this.cacheKey);

		if (!hash) return [];

		return Object.values(hash);
	}

	async deregisterAll() {
		await this.cacheService.delete(this.cacheKey);
	}

	toKey(webhook: Pick<IWebhookData, 'webhookId' | 'httpMethod' | 'path'>) {
		const { webhookId, httpMethod, path: webhookPath } = webhook;

		if (!webhookId) return [httpMethod, webhookPath].join('|');

		let path = webhookPath;

		if (path.startsWith(webhookId)) {
			const cutFromIndex = path.indexOf('/') + 1;

			path = path.slice(cutFromIndex);
		}

		return [httpMethod, webhookId, path.split('/').length].join('|');
	}
}
