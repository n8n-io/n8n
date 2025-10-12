import { OAuthClient } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
export class OAuthClientRepository extends Repository<OAuthClient> {
	constructor(dataSource: DataSource) {
		super(OAuthClient, dataSource.manager);
	}
}
