import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique, type Relation } from '@n8n/typeorm';

import { InstanceAiThread } from './instance-ai-thread.entity';

@Entity({ name: 'instance_ai_session_output_files' })
@Index(['threadId'])
@Unique(['threadId', 'fileName'])
export class InstanceAiSessionOutputFile extends WithTimestampsAndStringId {
	@ManyToOne(() => InstanceAiThread, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: Relation<InstanceAiThread>;

	@Column({ type: 'uuid' })
	threadId: string;

	@Column({ type: 'varchar', length: 64 })
	runId: string;

	@Column({ type: 'varchar', length: 128 })
	writerId: string;

	@Column({ type: 'varchar', length: 255 })
	fileName: string;

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	@Column({ type: 'int' })
	fileSizeBytes: number;

	@Column({ type: 'text' })
	binaryDataId: string;
}
