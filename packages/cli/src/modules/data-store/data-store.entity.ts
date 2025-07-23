import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, OneToMany } from '@n8n/typeorm';

import { DataStoreColumnEntity } from './data-store-column.entity';

@Entity()
export class DataStoreEntity extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@Column()
	name: string;

	@OneToMany(
		() => DataStoreColumnEntity,
		(dataStoreColumn) => dataStoreColumn.datastore,
		{
			cascade: true,
		},
	)
	fields: DataStoreColumnEntity[];
}
