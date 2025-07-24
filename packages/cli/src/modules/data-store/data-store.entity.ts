import { Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from '@n8n/typeorm';

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
		(dataStoreColumn) => dataStoreColumn.dataStore,
		{
			cascade: true,
		},
	)
	columns: DataStoreColumnEntity[];

	// @Review: No clue what I'm doing here
	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;
}
