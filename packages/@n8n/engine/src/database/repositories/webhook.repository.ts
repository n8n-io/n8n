import { DataSource, Repository } from '@n8n/typeorm';

import { WebhookEntity } from '../entities';

export class WebhookRepository extends Repository<WebhookEntity> {
	constructor(dataSource: DataSource) {
		super(WebhookEntity, dataSource.manager);
	}

	async findByMethodAndPath(method: string, path: string): Promise<WebhookEntity | null> {
		return await this.findOne({
			where: { method, path },
		});
	}
}
