import { ChatHubProvider } from '@n8n/api-types';
import { WithTimestamps, DateTimeColumn, User, CredentialsEntity, WorkflowEntity } from '@n8n/db';
import {
	Column,
	Entity,
	ManyToOne,
	OneToMany,
	JoinColumn,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';

import type { ChatHubMessage } from './chat-hub-message.entity';

@Entity({ name: 'chat_hub_sessions' })
export class ChatHubSession extends WithTimestamps {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * The title of the chat session/conversation.
	 * Auto-generated if not provided by the user after the initial AI responses.
	 */
	@Column({ type: 'varchar', length: 256 })
	title: string;

	/**
	 * ID of the user that owns this chat session.
	 */
	@Column({ type: String })
	ownerId: string;

	/**
	 * The user that owns this chat session.
	 */
	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'ownerId' })
	owner?: User;

	/*
	 * Timestamp of the last active message in the session.
	 * Used to sort chat sessions by recent activity.
	 */
	@DateTimeColumn({ nullable: true })
	lastMessageAt: Date | null;

	/*
	 * ID of the selected credential to use by default with the selected LLM provider (if applicable).
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	/**
	 * The selected credential to use by default with the selected LLM provider (if applicable).
	 */
	@ManyToOne('CredentialsEntity', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'credentialId' })
	credential?: CredentialsEntity | null;

	/*
	 * Enum value of the LLM provider to use, e.g. 'openai', 'anthropic', 'google', 'n8n' (if applicable).
	 */
	@Column({ type: 'varchar', length: 16, nullable: true })
	provider: ChatHubProvider | null;

	/*
	 * LLM model to use from the provider (if applicable)
	 */
	@Column({ type: 'varchar', length: 64, nullable: true })
	model: string | null;

	/*
	 * ID of the custom n8n agent workflow to use (if applicable)
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	workflowId: string | null;

	/**
	 * Custom n8n agent workflow to use (if applicable)
	 */
	@ManyToOne('WorkflowEntity', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'workflowId' })
	workflow?: WorkflowEntity | null;

	/*
	 * ID of the custom agent to use (if applicable).
	 * Only set when provider is 'custom-agent'.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	agentId: string | null;

	/*
	 * Cached name of the custom agent to use (if applicable).
	 * In case agent gets deleted
	 * Only set when provider is 'custom-agent'.
	 */
	@Column({ type: 'varchar', length: 128, nullable: true })
	agentName: string | null;

	/**
	 * All messages that belong to this chat session.
	 */
	@OneToMany('ChatHubMessage', 'session')
	messages?: ChatHubMessage[];
}
