import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, ManyToOne } from '@n8n/typeorm';

import { type DataStoreEntity } from './data-store.entity';
import { DataStoreColumnType } from './data-store.types';

@Entity('DataStoreColumn')
export class DataStoreColumnEntity extends WithTimestampsAndStringId {
	@Column()
	dataStoreId: string;

	@Column()
	name: string;

	@Column()
	type: DataStoreColumnType;

	@ManyToOne('DataStoreEntity', 'columns')
	dataStore: DataStoreEntity;
}
