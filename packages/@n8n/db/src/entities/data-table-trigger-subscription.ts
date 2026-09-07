import { Column, Entity, Index, PrimaryColumn, Unique } from '@n8n/typeorm';
import type { DataTableTriggerEvent } from 'n8n-workflow';

import { WithTimestamps } from './abstract-entity';

@Entity({ name: 'data_table_trigger_subscription' })
@Unique(['workflowId', 'nodeId'])
@Index(['dataTableId', 'event', 'columnId'])
@Index(['projectId'])
@Index(['columnId'])
export class DataTableTriggerSubscription extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	nodeId: string;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@Column({ type: 'varchar', length: 36 })
	dataTableId: string;

	@Column({ type: 'varchar', length: 20 })
	event: DataTableTriggerEvent;

	@Column({ type: 'varchar', length: 36, nullable: true })
	columnId: string | null;
}
