import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';
import type { DataTableTriggerEvent, DataTableTriggerOutput } from 'n8n-workflow';

import { DateTimeColumn, JsonColumn, WithTimestamps } from './abstract-entity';

@Entity({ name: 'data_table_mutation_event' })
@Index(['dataTableId', 'occurredAt'])
export class DataTableMutationEvent extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 36 })
	dataTableId: string;

	@Column({ type: 'int' })
	rowId: number;

	@Column({ type: 'varchar', length: 20 })
	event: DataTableTriggerEvent;

	@JsonColumn()
	payload: DataTableTriggerOutput;

	@DateTimeColumn()
	occurredAt: Date;
}
