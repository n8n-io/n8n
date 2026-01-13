import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	ManyToOne,
	JoinColumn,
	type Relation,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';
import { StoredMessage } from 'n8n-workflow';

import type { ChatMemorySession } from './chat-memory-session.entity';

export type ChatMemoryRole = 'human' | 'ai' | 'system' | 'tool';

/**
 * Stores agent memory entries on n8n's database for persistent Simple Memory Node support.
 */
@Entity({ name: 'chat_memory' })
export class ChatMemory extends WithTimestamps {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * Session key linking this memory to a memory session.
	 */
	@Column({ type: 'varchar', length: 255 })
	sessionKey: string;

	/**
	 * The memory session this entry belongs to.
	 */
	@ManyToOne('ChatMemorySession', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sessionKey', referencedColumnName: 'sessionKey' })
	memorySession?: Relation<ChatMemorySession>;

	/**
	 * Correlation ID linking this memory entry to a specific execution turn.
	 * A "turn" represents one request-response execution cycle.
	 * The turnId is generated BEFORE workflow execution starts and is shared
	 * between memory entries created during the execution and the AI message.
	 * NULL for manual executions. There is no FK constraint to chat_hub_messages.
	 */
	@Column({ type: String, nullable: true })
	turnId: string | null;

	/**
	 * Role of the message: 'human', 'ai', 'system', or 'tool'.
	 */
	@Column({ type: 'varchar', length: 16 })
	role: ChatMemoryRole;

	/**
	 * The content of the memory entry.
	 * For tool messages, this is JSON with tool call details.
	 */
	@Column({ type: 'json' })
	content: StoredMessage;

	/**
	 * Name of the actor (for tool messages, this is the tool name).
	 */
	@Column({ type: 'varchar', length: 255 })
	name: string;

	/**
	 * Optional expiration timestamp for automatic cleanup
	 */
	@DateTimeColumn({ nullable: true })
	expiresAt: Date | null;
}
