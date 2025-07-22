import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DataStoreEntity } from './data-store.entity';

@Service()
export class DataStoreRepository extends Repository<DataStoreEntity> {
	constructor(dataSource: DataSource) {
		super(DataStoreEntity, dataSource.manager);
	}

	async getSummary() {
		return await Promise.resolve({});
	}
}
