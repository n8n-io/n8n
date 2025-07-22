import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { Datastore } from '../entities/datastore';

@Service()
export class DatastoreRepository extends Repository<Datastore> {
	constructor(dataSource: DataSource) {
		super(Datastore, dataSource.manager);
	}
}
