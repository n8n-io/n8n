import type { ChatHubProvider, ChatHubMessageType, ChatHubMessageStatus } from '@n8n/api-types';
import { ExecutionEntity, WithTimestamps, WorkflowEntity } from '@n8n/db';
import {
	Column,
	Entity,
	ManyToOne,
	JoinColumn,
	type Relation,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';

import type { ChatHubSession } from './chat-hub-session.entity';
import type { IBinaryData } from 'n8n-workflow';

@Entity({ name: 'chat_hub_messages' })
export class ChatHubMessage extends WithTimestamps {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * ID of the chat session/conversation this message belongs to.
	 */
	@Column({ type: String })
	sessionId: string;

	/**
	 * The chat session/conversation this message belongs to.
	 */
	@ManyToOne('ChatHubSession', 'messages', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sessionId' })
	session: Relation<ChatHubSession>;

	/**
	 * Type of the message, e.g. 'human', 'ai', 'system', 'tool', 'generic'.
	 */
	@Column({ type: 'varchar', length: 16 })
	type: ChatHubMessageType;

	/**
	 * Name of the actor that sent the message, e.g. 'AI', 'HTTP Tool', 'Nathan' etc
	 */
	@Column({ type: 'varchar', length: 128 })
	name: string;

	/**
	 * The main content of the message. Might be text, JSON, etc depending on the message type.
	 */
	@Column('text')
	content: string;

	/**
	 * Enum value of the LLM provider that generated this message, e.g. 'openai', 'anthropic', 'google', 'n8n'.
	 * Human messages have this field set to NULL.
	 */
	@Column({ type: 'varchar', length: 16, nullable: true })
	provider: ChatHubProvider | null;

	/**
	 * The LLM model that generated this message (if applicable).
	 * Human messages have this field set to NULL.
	 */
	@Column({ type: 'varchar', length: 64, nullable: true })
	model: string | null;

	/**
	 * ID of a custom n8n agent workflow that produced this message (if applicable).
	 * Human messages have this field set to NULL.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;

	/**
	 * Custom n8n agent workflow that produced this message (if applicable).
	 */
	@ManyToOne('WorkflowEntity', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'workflowId' })
	workflow?: Relation<WorkflowEntity> | null;

	/**
	 * ID of the custom agent that produced this message (if applicable).
	 * Only set when provider is 'custom-agent'.
	 */
	@Column({ type: 'uuid', nullable: true })
	agentId: string | null;

	/**
	 * ID of an execution that produced this message (reset to null when the execution is deleted).
	 */
	@Column({ type: 'int', nullable: true })
	executionId: number | null;

	/**
	 * Execution that produced this message (reset to null when the execution is deleted)
	 */
	@ManyToOne('ExecutionEntity', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'executionId' })
	execution?: Relation<ExecutionEntity> | null;

	/**
	 * ID of the previous message this message is a response to, NULL on the initial message.
	 */
	@Column({ type: String, nullable: true })
	previousMessageId: string | null;

	/**
	 * ID of the message that this message is a retry of (if applicable).
	 */
	@Column({ type: String, nullable: true })
	retryOfMessageId: string | null;
	/**
	 * ID of the message that this message is a revision/edit of (if applicable).
	 */
	@Column({ type: String, nullable: true })
	revisionOfMessageId: string | null;

	/**
	 * Status of the message, e.g. 'running', 'success', 'error', 'cancelled'.
	 */
	@Column({ type: 'varchar', length: 16, default: 'success' })
	status: ChatHubMessageStatus;

	/**
	 * File attachments for the message (if any), stored as JSON.
	 * Storage strategy depends on the binary data mode configuration:
	 * - When using external storage (e.g., filesystem-v2): Only metadata is stored, with 'id' referencing the external location
	 * - When using default mode: Base64-encoded data is stored directly in the 'data' field
	 */
	@Column({ type: 'json', nullable: true })
	attachments: Array<IBinaryData> | null;
}
