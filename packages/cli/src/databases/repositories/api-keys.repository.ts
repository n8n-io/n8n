import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { ApiKeys } from '../entities/api-keys';

@Service()
export class ApiKeysRepository extends Repository<ApiKeys> {
	constructor(dataSource: DataSource) {
		super(ApiKeys, dataSource.manager);
	}
}
