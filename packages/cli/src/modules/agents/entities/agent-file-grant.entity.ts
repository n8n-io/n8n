import { WithTimestamps } from '@n8n/db';
import { Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from '@n8n/typeorm';

import { AgentChatAttachment } from './agent-chat-attachment.entity';

/**
 * Lets a thread read a file that it did not make. A parent thread grants a
 * file to its sub-agent thread, and that thread can grant it on to its own
 * sub-agents. `threadId` has no FK: inline agents have no thread rows.
 */
@Entity({ name: 'agent_file_grants' })
export class AgentFileGrant extends WithTimestamps {
	@ManyToOne(() => AgentChatAttachment, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'attachmentId' })
	attachment: Relation<AgentChatAttachment>;

	@PrimaryColumn({ type: 'varchar', length: 16 })
	attachmentId: string;

	@PrimaryColumn({ type: 'varchar', length: 128 })
	threadId: string;
}
