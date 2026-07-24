import { Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

/**
 * A file a user attached to an agent conversation (preview chat or a channel
 * message). Bytes live in `BinaryDataService`; message content parts reference
 * rows here via `ContentFileRef.id`.
 *
 * Scoped by `projectId` + `threadId` rather than the agent alone: inline
 * agents (config embedded in a workflow node) have no `agents` row, so
 * `agentId` is nullable — mirroring how `agents_threads`/`agents_messages`
 * carry no agent FK.
 */
@Entity({ name: 'agent_chat_attachments' })
@Index(['projectId', 'threadId'])
@Index(['agentId', 'threadId'])
export class AgentChatAttachment extends WithTimestampsAndStringId {
	@ManyToOne(() => Agent, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent> | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	agentId: string | null;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Relation<Project>;

	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	/** Conversation thread id; widths match agent_execution.threadId (prefixed ids exceed a bare uuid). */
	@Column({ type: 'varchar', length: 128 })
	threadId: string;

	/** Per-user scope within the thread (platform user), when known. */
	@Column({ type: 'varchar', length: 255, nullable: true })
	resourceId: string | null;

	/**
	 * BinaryDataService id (e.g. `filesystem-v2:agent-chat-attachments/<projectId>/<id>/binary_data/<uuid>`).
	 * Not a DB FK — see `BinaryDataService` in `n8n-core` for how the bytes are resolved from this id.
	 */
	@Column({ type: 'text' })
	binaryDataId: string;

	@Column({ type: 'varchar', length: 255 })
	fileName: string;

	@Column({ type: 'varchar', length: 255 })
	mimeType: string;

	@Column({ type: 'int' })
	fileSizeBytes: number;

	/** Surface the file arrived from, e.g. 'chat', 'slack', 'telegram'. */
	@Column({ type: 'varchar', length: 32 })
	source: string;
}
