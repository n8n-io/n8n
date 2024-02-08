import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { WebhookEntity } from '../entities/WebhookEntity';

@Service()
export class WebhookRepository extends Repository<WebhookEntity> {
	constructor(dataSource: DataSource) {
		super(WebhookEntity, dataSource.manager);
	}
}
