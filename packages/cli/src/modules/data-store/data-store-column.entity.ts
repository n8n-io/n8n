import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { type DataStore } from './data-store.entity';

@Entity()
@Index(['dataStoreId', 'name'], { unique: true })
export class DataStoreColumn extends WithTimestampsAndStringId {
	@Column()
	dataStoreId: string;

	@Column()
	name: string;

	@Column({ type: 'varchar' })
	type: 'string' | 'number' | 'boolean' | 'date';

	@Column({ type: 'int' })
	index: number;

	@ManyToOne('DataStore', 'columns')
	@JoinColumn({ name: 'dataStoreId' })
	dataStore: DataStore;
}
