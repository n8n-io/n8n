import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ApiKey } from '../entities';

@Service()
export class ApiKeyRepository extends Repository<ApiKey> {
	constructor(dataSource: DataSource) {
		super(ApiKey, dataSource.manager);
	}
}
