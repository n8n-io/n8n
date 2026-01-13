import { WithTimestamps } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn, type Relation, PrimaryColumn } from '@n8n/typeorm';

import type { ChatHubSession } from './chat-hub-session.entity';

/**
 * Manages memory sessions independently from chat hub sessions.
 * This decouples memory session IDs from chat hub session IDs, allowing:
 * - Flexible session keys (arbitrary strings, not just UUIDs)
 * - Standalone memory usage without requiring a chat hub session
 * - Optional linking to chat hub sessions when used in chat hub context
 */
@Entity({ name: 'chat_memory_sessions' })
export class ChatMemorySession extends WithTimestamps {
	/**
	 * User-provided session key (flexible string format).
	 * On Chat hub this is equal to the chat hub session UUID.
	 * Examples: "user:123:session:abc", UUID, or any custom string.
	 */
	@PrimaryColumn({ type: 'varchar', length: 255 })
	sessionKey: string;

	/**
	 * Optional link to a chat hub session, populated on Chat hub executions.
	 * When the linked chat hub session is deleted it cascade deletes this session and its memory entries.
	 */
	@Column({ type: 'uuid', nullable: true })
	chatHubSessionId: string | null;

	/**
	 * The linked chat hub session (if any).
	 * Anonymous sessions (manual executions, chat trigger executions) don't have a chat hub session.
	 */
	@ManyToOne('ChatHubSession', { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'chatHubSessionId' })
	chatHubSession?: Relation<ChatHubSession> | null;

	/**
	 * Which workflow created this session. Might become handy if we start displaying storage space used by workflow.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;
}
