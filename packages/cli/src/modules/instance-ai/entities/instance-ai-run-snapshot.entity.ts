import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, PrimaryColumn } from '@n8n/typeorm';

@Entity({ name: 'instance_ai_run_snapshots' })
@Index(['threadId', 'messageGroupId'])
@Index(['threadId', 'createdAt'])
export class InstanceAiRunSnapshot extends WithTimestamps {
	@PrimaryColumn('varchar')
	threadId: string;

	@PrimaryColumn('varchar')
	runId: string;

	@Column({ type: 'varchar', nullable: true })
	messageGroupId: string | null;

	@Column({ type: 'simple-json', nullable: true })
	runIds: string[] | null;

	@Column({ type: 'text' })
	tree: string;
}
