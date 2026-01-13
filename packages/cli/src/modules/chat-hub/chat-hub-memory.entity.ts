import { WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	ManyToOne,
	JoinColumn,
	type Relation,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';
import { StoredMessage } from 'n8n-workflow';

import type { ChatHubSession } from './chat-hub-session.entity';

export type ChatHubMemoryRole = 'human' | 'ai' | 'system' | 'tool';

/**
 * Stores agent memory entries separately from chat UI messages.
 * This allows:
 * - Multiple memory nodes in the same workflow to have isolated memory
 * - Memory branching on edit/retry via turnId (correlation ID for execution turns)
 * - Separation between what the agent remembers vs what the user sees
 */
@Entity({ name: 'chat_hub_memory' })
export class ChatHubMemory extends WithTimestamps {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * ID of the chat session this memory belongs to.
	 */
	@Column({ type: String })
	sessionId: string;

	/**
	 * The chat session this memory belongs to.
	 */
	@ManyToOne('ChatHubSession', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sessionId' })
	session?: Relation<ChatHubSession>;

	/**
	 * The n8n node ID of the MemoryChatHub node that owns this memory.
	 * Each memory node on the canvas has its own isolated memory space.
	 */
	@Column({ type: 'varchar', length: 36 })
	memoryNodeId: string;

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
	role: ChatHubMemoryRole;

	/**
	 * The content of the memory entry.
	 * For tool messages, this is JSON with tool call details.
	 */
	@Column({ type: 'json' })
	content: StoredMessage;

	/**
	 * Name of the actor (for tool messages, this is the tool name).
	 */
	@Column({ type: 'varchar', length: 256 })
	name: string;
}
