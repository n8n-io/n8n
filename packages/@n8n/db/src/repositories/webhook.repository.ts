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
}
