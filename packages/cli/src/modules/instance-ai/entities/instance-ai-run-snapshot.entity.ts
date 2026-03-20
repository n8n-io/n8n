import { JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';
import type { InstanceAiAgentNode } from '@n8n/api-types';

@Entity({ name: 'instance_ai_run_snapshots' })
export class InstanceAiRunSnapshot extends WithTimestamps {
	@PrimaryColumn('varchar')
	id: string;

	@Index()
	@Column({ type: 'varchar' })
	threadId: string;

	@Index()
	@Column({ type: 'varchar' })
	runId: string;

	@Index()
	@Column({ type: 'varchar', nullable: true })
	messageGroupId: string | null;

	@JsonColumn()
	tree: InstanceAiAgentNode;

	@JsonColumn({ nullable: true })
	runIds: string[] | null;
}
