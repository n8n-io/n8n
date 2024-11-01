import { DataSource, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { TestEntity } from '@/databases/entities/test-entity';

@Service()
export class TestRepository extends Repository<TestEntity> {
	constructor(dataSource: DataSource) {
		super(TestEntity, dataSource.manager);
	}
}
