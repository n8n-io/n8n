import { DataSource, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { ApiKey } from '../entities/api-keys';

@Service()
export class ApiKeysRepository extends Repository<ApiKey> {
	constructor(dataSource: DataSource) {
		super(ApiKey, dataSource.manager);
	}
}
