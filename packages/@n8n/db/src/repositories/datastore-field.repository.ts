import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DatastoreField } from '../entities/datastore-field';

@Service()
export class DatastoreFieldRepository extends Repository<DatastoreField> {
	constructor(dataSource: DataSource) {
		super(DatastoreField, dataSource.manager);
	}
}
