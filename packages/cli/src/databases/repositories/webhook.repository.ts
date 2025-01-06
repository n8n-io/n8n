import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WebhookEntity } from '../entities/webhook-entity';

@Service()
export class WebhookRepository extends Repository<WebhookEntity> {
	constructor(dataSource: DataSource) {
		super(WebhookEntity, dataSource.manager);
	}
}
