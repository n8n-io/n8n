import { JsonColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import type { BoardAllowedStatus } from '@n8n/api-types';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from '@n8n/typeorm';

import { DataTableColumn } from './data-table-column.entity';

export type DataTableKind = 'board' | 'list';

export type DataTableMetadata = {
	allowedStatuses?: BoardAllowedStatus[];
};

@Entity()
@Index(['name', 'projectId'], { unique: true })
export class DataTable extends WithTimestampsAndStringId {
	constructor() {
		super();
	}

	@Column()
	name: string;

	@Column({ type: 'varchar', length: 16, default: 'list' })
	kind: DataTableKind;

	@JsonColumn({ nullable: true, default: '{}' })
	metadata: DataTableMetadata;

	@OneToMany(
		() => DataTableColumn,
		(dataTableColumn) => dataTableColumn.dataTable,
		{
			cascade: true,
		},
	)
	columns: DataTableColumn[];

	@ManyToOne(() => Project)
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Column()
	projectId: string;
}
