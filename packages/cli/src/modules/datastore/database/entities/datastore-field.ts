import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, ManyToOne } from '@n8n/typeorm';

import { type Datastore } from './datastore';
import { DatastoreFieldType } from '../../datastore.types';

@Entity()
export class DatastoreField extends WithTimestampsAndStringId {
	@Column()
	datastoreId: string;

	@Column()
	name: string;

	@Column()
	type: DatastoreFieldType;

	@ManyToOne('Datastore', 'fields')
	datastore: Datastore;
}
