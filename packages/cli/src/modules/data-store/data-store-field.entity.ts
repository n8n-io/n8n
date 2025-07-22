import { Column, Entity, ManyToOne } from '@n8n/typeorm';

import { WithTimestampsAndStringId } from '@n8n/db/src/entities/abstract-entity';
import { type DataStore } from './data-store.entity';
// import { DatastoreFieldType } from '../../datastore.types';

@Entity('DataStoreField')
export class DataStoreField extends WithTimestampsAndStringId {
	@Column()
	datastoreId: string;

	@Column()
	name: string;

	// @Column()
	// type: DatastoreFieldType;

	@ManyToOne('DataStore', 'fields')
	datastore: DataStore;
}
