import { WebhookEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
export class WebhookRepository extends Repository<WebhookEntity> {
	constructor(dataSource: DataSource) {
		super(WebhookEntity, dataSource.manager);
	}
}
