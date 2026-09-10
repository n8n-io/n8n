import type { FindOperator, ValueTransformer } from '@n8n/typeorm';
import { Column, Entity, Index, PrimaryColumn, Unique } from '@n8n/typeorm';
import type { DataTableAutomationStatus } from 'n8n-workflow';

import { WithTimestamps } from './abstract-entity';

const nullableIdStringifier = {
	from: (value: number | null): string | null => (value === null ? null : value.toString()),
	to: (value: string | FindOperator<unknown> | null): number | FindOperator<unknown> | null =>
		typeof value === 'string' ? Number(value) : value,
} satisfies ValueTransformer;

/** Latest state of one Data Table Trigger for one row. Lives until the row is deleted. */
@Entity({ name: 'data_table_row_automation' })
@Unique(['dataTableId', 'rowId', 'workflowId', 'nodeId'])
@Index(['workflowId', 'nodeId'])
@Index(['executionId'])
export class DataTableRowAutomation extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 36 })
	dataTableId: string;

	@Column({ type: 'int' })
	rowId: number;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	nodeId: string;

	@Column({ type: 'varchar', length: 20 })
	status: DataTableAutomationStatus;

	@Column({ type: 'bigint', nullable: true, transformer: nullableIdStringifier })
	executionId: string | null;

	@Column({ type: 'text', nullable: true })
	error: string | null;
}
