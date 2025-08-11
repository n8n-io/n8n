import { Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from '@n8n/typeorm';

import { DataStoreColumn } from './data-store-column.entity';

@Entity()
@Index(['name', 'projectId'], { unique: true })
export class DataStore extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@Column()
	name: string;

	@OneToMany(
		() => DataStoreColumn,
		(dataStoreColumn) => dataStoreColumn.dataStore,
		{
			cascade: true,
		},
	)
	columns: DataStoreColumn[];

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;

	@Column({ type: 'int', default: 0 })
	sizeBytes: number;
}
