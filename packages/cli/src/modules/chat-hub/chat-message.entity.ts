import { ChatHubProvider } from '@n8n/api-types';
import { ExecutionEntity, WithTimestampsAndStringId, WorkflowEntity } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn, OneToMany } from '@n8n/typeorm';

import { ChatMessageState } from './chat-hub.types';
import { ChatSession } from './chat-session.entity';

export type ChatMessageType = 'human' | 'ai' | 'system' | 'tool' | 'generic';
export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool' | null;

@Entity({ name: 'chat_messages' })
export class ChatMessage extends WithTimestampsAndStringId {
	/**
	 * ID of the chat session/conversation this message belongs to.
	 */
	@Column({ type: 'varchar', length: 36 })
	sessionId: string;

	/**
	 * The chat session/conversation this message belongs to.
	 */
	@ManyToOne('ChatSession', 'messages', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sessionId' })
	session: ChatSession;

	/**
	 * Type of the message, e.g. 'human', 'ai', 'system', 'tool', 'generic'.
	 */
	@Column({ type: 'varchar', length: 16 })
	type: ChatMessageType;

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
	@ManyToOne('WorkflowEntity', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'workflowId' })
	workflow?: WorkflowEntity | null;

	/**
	 * ID of an execution that produced this message (reset to null when the execution is deleted).
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	executionId: string | null;

	/**
	 * Execution that produced this message (reset to null when the execution is deleted)
	 */
	@ManyToOne('ExecutionEntity', { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'executionId' })
	execution?: ExecutionEntity | null;

	/**
	 * ID of the message this message is a response to, NULL on the initial message.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	responseOfMessageId!: string | null;

	/**
	 * The message this message is a response to, NULL on the initial message.
	 */
	@ManyToOne('ChatMessage', (m: ChatMessage) => m.responses, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'responseOfMessageId' })
	responseOfMessage?: ChatMessage | null;

	/**
	 * Messages that are responses to this message. This could branch out to multiple threads.
	 */
	@OneToMany('ChatMessage', (m: ChatMessage) => m.responseOfMessage)
	responses?: ChatMessage[];

	/**
	 * Root message of a conversation turn (Human message + AI responses)
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	turnId: string | null;

	/**
	 * Message that began the turn, probably from the human/user.
	 */
	@ManyToOne('ChatMessage', (m: ChatMessage) => m.turnMessages, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'turnId' })
	turn?: ChatMessage | null;

	/**
	 * All messages that are part of this turn (including the root message).
	 */
	@OneToMany('ChatMessage', (m: ChatMessage) => m.turn)
	turnMessages?: ChatMessage[];

	/**
	 * ID of the message that this message is a retry of (if applicable).
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	retryOfMessageId: string | null;

	/**
	 * The message that this message is a retry of (if applicable).
	 */
	@ManyToOne('ChatMessage', (m: ChatMessage) => m.retries, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'retryOfMessageId' })
	retryOfMessage?: ChatMessage | null;

	/**
	 * All messages that are retries of this message (if applicable).
	 */
	@OneToMany('ChatMessage', (m: ChatMessage) => m.retryOfMessage)
	retries?: ChatMessage[];

	/**
	 * The nth time this message has been generated/retried within the turn (0 = first attempt).
	 */
	@Column({ type: 'int', default: 0 })
	runIndex: number;

	/**
	 * ID of the message that this message is a revision/edit of (if applicable).
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	revisionOfMessageId: string | null;

	/**
	 * The message that this message is a revision/edit of (if applicable).
	 */
	@ManyToOne('ChatMessage', (m: ChatMessage) => m.revisions, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'revisionOfMessageId' })
	revisionOfMessage?: ChatMessage | null;

	/**
	 * All messages that are revisions/edits of this message (if applicable).
	 */
	@OneToMany('ChatMessage', (m: ChatMessage) => m.revisionOfMessage)
	revisions?: ChatMessage[];

	/**
	 * State of the message, e.g. 'active', 'superseded', 'hidden', 'deleted'.
	 */
	@Column({ type: 'varchar', length: 16, default: 'active' })
	state: ChatMessageState;
}
