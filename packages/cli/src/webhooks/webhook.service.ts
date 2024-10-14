import type { IHttpRequestMethods } from 'n8n-workflow';
import { Service } from 'typedi';

import type { WebhookEntity } from '@/databases/entities/webhook-entity';
import { WebhookRepository } from '@/databases/repositories/webhook.repository';
import { CacheService } from '@/services/cache/cache.service';

type Method = NonNullable<IHttpRequestMethods>;

@Service()
export class WebhookService {
	constructor(
		private webhookRepository: WebhookRepository,
		private cacheService: CacheService,
	) {}

	async populateCache() {
		const allWebhooks = await this.webhookRepository.find();

		if (!allWebhooks) return;

		void this.cacheService.setMany(allWebhooks.map((w) => [w.cacheKey, w]));
	}

	private async findCached(method: Method, path: string) {
		const cacheKey = `webhook:${method}-${path}`;

		const cachedWebhook = await this.cacheService.get(cacheKey);

		if (cachedWebhook) return this.webhookRepository.create(cachedWebhook);

		let dbWebhook = await this.findStaticWebhook(method, path);

		if (dbWebhook === null) {
			dbWebhook = await this.findDynamicWebhook(method, path);
		}

		void this.cacheService.set(cacheKey, dbWebhook);

		return dbWebhook;
	}

	/**
	 * Find a matching webhook with zero dynamic path segments, e.g. `<uuid>` or `user/profile`.
	 */
	private async findStaticWebhook(method: Method, path: string) {
		return await this.webhookRepository.findOneBy({ webhookPath: path, method });
	}

	/**
	 * Find a matching webhook with one or more dynamic path segments, e.g. `<uuid>/user/:id/posts`.
	 * It is mandatory for dynamic webhooks to have `<uuid>/` at the base.
	 */
	private async findDynamicWebhook(method: Method, path: string) {
		const [uuidSegment, ...otherSegments] = path.split('/');

		const dynamicWebhooks = await this.webhookRepository.findBy({
			webhookId: uuidSegment,
			method,
			pathLength: otherSegments.length,
		});

		if (dynamicWebhooks.length === 0) return null;

		const requestSegments = new Set(otherSegments);

		const { webhook } = dynamicWebhooks.reduce<{
			webhook: WebhookEntity | null;
			maxMatches: number;
		}>(
			(acc, dw) => {
				const allStaticSegmentsMatch = dw.staticSegments.every((s) => requestSegments.has(s));

				if (allStaticSegmentsMatch && dw.staticSegments.length > acc.maxMatches) {
					acc.maxMatches = dw.staticSegments.length;
					acc.webhook = dw;
					return acc;
				} else if (dw.staticSegments.length === 0 && !acc.webhook) {
					acc.webhook = dw; // edge case: if path is `:var`, match on anything
				}

				return acc;
			},
			{ webhook: null, maxMatches: 0 },
		);

		return webhook;
	}

	async findWebhook(method: Method, path: string) {
		return await this.findCached(method, path);
	}

	async storeWebhook(webhook: WebhookEntity) {
		void this.cacheService.set(webhook.cacheKey, webhook);

		await this.webhookRepository.upsert(webhook, ['method', 'webhookPath']);
	}

	createWebhook(data: Partial<WebhookEntity>) {
		return this.webhookRepository.create(data);
	}

	async deleteWorkflowWebhooks(workflowId: string) {
		const webhooks = await this.webhookRepository.findBy({ workflowId });

		return await this.deleteWebhooks(webhooks);
	}

	private async deleteWebhooks(webhooks: WebhookEntity[]) {
		void this.cacheService.deleteMany(webhooks.map((w) => w.cacheKey));

		return await this.webhookRepository.remove(webhooks);
	}

	async getWebhookMethods(path: string) {
		return await this.webhookRepository
			.find({ select: ['method'], where: { webhookPath: path } })
			.then((rows) => rows.map((r) => r.method));
	}
}
