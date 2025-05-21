import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, OneToMany } from '@n8n/typeorm';

import { DatastoreField } from './datastore-field';

@Entity()
export class Datastore extends WithTimestampsAndStringId {
	@Column()
	name: string;

	@OneToMany(
		() => DatastoreField,
		(datastoreField) => datastoreField.datastore,
		{
			cascade: true,
		},
	)
	fields: DatastoreField[];
}
