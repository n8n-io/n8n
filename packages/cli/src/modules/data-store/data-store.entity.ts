import { WithTimestamps, WithTimestampsAndStringId } from '@n8n/db/src/entities/abstract-entity';
import { BaseEntity, Column, Entity, OneToMany } from '@n8n/typeorm';

import { DataStoreField } from './data-store-field.entity';

@Entity()
// export class DataStore extends BaseEntity {
export class DataStore extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@Column()
	name: string;

	@OneToMany(
		() => DataStoreField,
		(dataStoreField) => dataStoreField.datastore,
		{
			cascade: true,
		},
	)
	fields: DataStoreField[];
}
