import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { InstanceAiThread } from './instance-ai-thread.entity';

/**
 * A file a user attached to an Instance AI Session. Bytes live in
 * BinaryDataService; this row holds metadata and the Session scope.
 */
@Entity({ name: 'instance_ai_chat_attachments' })
@Index(['threadId'])
export class InstanceAiChatAttachment extends WithTimestampsAndStringId {
	@ManyToOne(() => InstanceAiThread, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: Relation<InstanceAiThread>;

	@Column({ type: 'uuid' })
	threadId: string;

	@Column({ type: 'varchar', length: 36, nullable: true })
	messageId: string | null;

	@Column({ type: 'text' })
	binaryDataId: string;

	@Column({ type: 'varchar', length: 255 })
	fileName: string;

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	@Column({ type: 'int' })
	fileSizeBytes: number;
}
