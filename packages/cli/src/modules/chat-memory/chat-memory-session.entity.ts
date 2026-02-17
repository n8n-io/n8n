import { Project, WithTimestamps } from '@n8n/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

/**
 * Manages memory sessions independently from chat hub sessions.
 * This decouples memory session IDs from chat hub session IDs, allowing:
 * - Flexible session keys (arbitrary strings, not just UUIDs)
 * - Standalone memory usage without requiring a chat hub session
 * - Project-scoped memory for access control
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

	/** Project this memory session belongs to */
	@Column({ type: 'varchar', length: 36 })
	projectId: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project?: Project;

	/**
	 * Which workflow created this session. Might become handy if we start displaying storage space used by workflow.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;
}
