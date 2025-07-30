import { Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from '@n8n/typeorm';

import { DataStoreColumnEntity } from './data-store-column.entity';

@Entity()
@Index(['name', 'projectId'], { unique: true })
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

	// @Review: No clue what I'm doing here, please double check this
	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;

	@Column({ type: 'int', default: 0 })
	sizeBytes: number;
}
