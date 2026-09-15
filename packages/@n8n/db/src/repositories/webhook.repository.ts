import { Service } from '@n8n/di';
import { DataSource, IsNull, Repository } from '@n8n/typeorm';

import { WebhookEntity } from '../entities';

@Service()
export class WebhookRepository extends Repository<WebhookEntity> {
	constructor(dataSource: DataSource) {
		super(WebhookEntity, dataSource.manager);
	}

	/**
	 * Retrieve all webhooks whose paths only have static segments, e.g. `{uuid}` or `user/profile`.
	 * This excludes webhooks having paths with dynamic segments, e.g. `{uuid}/user/:id/posts`.
	 */
	async getStaticWebhooks() {
		return await this.findBy({ webhookId: IsNull() });
	}

	/**
	 * Retrieve every static webhook (no dynamic path segments) registered at the
	 * given path, across all HTTP methods. A node listening on multiple methods
	 * registers one row per method, so a single path can map to several rows.
	 */
	async findStaticWebhooksByPath(webhookPath: string) {
		return await this.findBy({ webhookPath, webhookId: IsNull() });
	}

	/**
	 * Retrieve every dynamic webhook (path with `:` segments) sharing a `webhookId`
	 * and path length, across all HTTP methods. A `webhookId` belongs to a single
	 * node, so these rows are one trigger's method registrations. Used by the OAuth
	 * resolver to build a trigger's method-set; segment matching is done by the
	 * caller, mirroring the routing matcher.
	 */
	async findDynamicWebhooksByWebhookId(webhookId: string, pathLength: number) {
		return await this.findBy({ webhookId, pathLength });
	}
}
