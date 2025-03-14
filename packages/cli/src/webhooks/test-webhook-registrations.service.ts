import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { IWebhookData, IWorkflowBase } from 'n8n-workflow';

import { TEST_WEBHOOK_TIMEOUT, TEST_WEBHOOK_TIMEOUT_BUFFER } from '@/constants';
import { CacheService } from '@/services/cache/cache.service';

export type TestWebhookRegistration = {
	pushRef?: string;
	workflowEntity: IWorkflowBase;
	destinationNode?: string;
	webhook: IWebhookData;
};

@Service()
export class TestWebhookRegistrationsService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	private readonly cacheKey = 'test-webhooks';

	async register(registration: TestWebhookRegistration) {
		const hashKey = this.toKey(registration.webhook);

		await this.cacheService.setHash(this.cacheKey, { [hashKey]: registration });

		if (this.instanceSettings.isSingleMain) return;

		/**
		 * Multi-main setup: In a manual webhook execution, the main process that
		 * handles a webhook might not be the same as the main process that created
		 * the webhook. If so, after the test webhook has been successfully executed,
		 * the handler process commands the creator process to clear its test webhooks.
		 * We set a TTL on the key so that it is cleared even on creator process crash,
		 * with an additional buffer to ensure this safeguard expiration will not delete
		 * the key before the regular test webhook timeout fetches the key to delete it.
		 */
		const ttl = TEST_WEBHOOK_TIMEOUT + TEST_WEBHOOK_TIMEOUT_BUFFER;

		await this.cacheService.expire(this.cacheKey, ttl);
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
		return await this.cacheService.getHashValue<TestWebhookRegistration>(this.cacheKey, key);
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
