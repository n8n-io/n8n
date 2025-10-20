import type { ChatHubProvider, ChatHubMessageType, ChatHubMessageState } from '@n8n/api-types';
import { ExecutionEntity, WithTimestamps, WorkflowEntity } from '@n8n/db';
import {
	Column,
	Entity,
	ManyToOne,
	JoinColumn,
	OneToMany,
	type Relation,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';

import type { ChatHubSession } from './chat-hub-session.entity';

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
	 * The previous message this message is a response to, NULL on the initial message.
	 */
	@ManyToOne('ChatHubMessage', (m: ChatHubMessage) => m.responses, {
		onDelete: 'CASCADE',
		nullable: true,
	})
	@JoinColumn({ name: 'previousMessageId' })
	previousMessage?: Relation<ChatHubMessage> | null;

	/**
	 * Messages that are responses to this message. This could branch out to multiple threads.
	 */
	@OneToMany('ChatHubMessage', (m: ChatHubMessage) => m.previousMessage)
	responses?: Array<Relation<ChatHubMessage>>;

	/**
	 * ID of the message that this message is a retry of (if applicable).
	 */
	@Column({ type: String, nullable: true })
	retryOfMessageId: string | null;

	/**
	 * The message that this message is a retry of (if applicable).
	 */
	@ManyToOne('ChatHubMessage', (m: ChatHubMessage) => m.retries, {
		onDelete: 'CASCADE',
		nullable: true,
	})
	@JoinColumn({ name: 'retryOfMessageId' })
	retryOfMessage?: Relation<ChatHubMessage> | null;

	/**
	 * All messages that are retries of this message (if applicable).
	 */
	@OneToMany('ChatHubMessage', (m: ChatHubMessage) => m.retryOfMessage)
	retries?: Array<Relation<ChatHubMessage>>;

	/**
	 * ID of the message that this message is a revision/edit of (if applicable).
	 */
	@Column({ type: String, nullable: true })
	revisionOfMessageId: string | null;

	/**
	 * The message that this message is a revision/edit of (if applicable).
	 */
	@ManyToOne('ChatHubMessage', (m: ChatHubMessage) => m.revisions, {
		onDelete: 'CASCADE',
		nullable: true,
	})
	@JoinColumn({ name: 'revisionOfMessageId' })
	revisionOfMessage?: Relation<ChatHubMessage> | null;

	/**
	 * All messages that are revisions/edits of this message (if applicable).
	 */
	@OneToMany('ChatHubMessage', (m: ChatHubMessage) => m.revisionOfMessage)
	revisions?: Array<Relation<ChatHubMessage>>;

	/**
	 * State of the message, e.g. 'success', 'error'.
	 */
	@Column({ type: 'varchar', length: 16, default: 'success' })
	state: ChatHubMessageState;
}
