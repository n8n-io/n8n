import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { type DataTable } from './data-table.entity';

@Entity()
@Index(['dataTableId', 'name'], { unique: true })
export class DataTableColumn extends WithTimestampsAndStringId {
	@Column()
	dataTableId: string;

	@Column()
	name: string;

	@Column({ type: 'varchar' })
	type: 'string' | 'number' | 'boolean' | 'date';

	@Column({ type: 'int' })
	index: number;

	@ManyToOne('DataTable', 'columns')
	@JoinColumn({ name: 'dataTableId' })
	dataTable: DataTable;
}
