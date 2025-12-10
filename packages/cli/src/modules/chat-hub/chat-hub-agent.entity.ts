import { ChatHubLLMProvider, AgentIconOrEmoji } from '@n8n/api-types';
import { WithTimestamps, User, CredentialsEntity, JsonColumn } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from '@n8n/typeorm';
import { INode } from 'n8n-workflow';

@Entity({ name: 'chat_hub_agents' })
export class ChatHubAgent extends WithTimestamps {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * The name of the chat agent.
	 */
	@Column({ type: 'varchar', length: 128 })
	name: string;

	/**
	 * The description of the chat agent (optional).
	 */
	@Column({ type: 'varchar', length: 512, nullable: true })
	description: string | null;

	/**
	 * The icon or emoji for the chat agent.
	 */
	@JsonColumn()
	icon: AgentIconOrEmoji;

	/**
	 * The system prompt for the chat agent.
	 */
	@Column({ type: 'text' })
	systemPrompt: string;

	/**
	 * ID of the user that owns this chat agent.
	 */
	@Column({ type: String })
	ownerId: string;

	/**
	 * The user that owns this chat agent.
	 */
	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'ownerId' })
	owner?: User;

	/*
	 * ID of the selected credential to use by default with the selected LLM provider.
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	/**
	 * The selected credential to use by default with the selected LLM provider.
	 */
	@ManyToOne('CredentialsEntity', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'credentialId' })
	credential?: CredentialsEntity | null;

	/*
	 * Enum value of the LLM provider to use, e.g. 'openai', 'anthropic', 'google'.
	 */
	@Column({ type: 'varchar', length: 16, nullable: true })
	provider: ChatHubLLMProvider;

	/*
	 * LLM model to use from the provider (if applicable)
	 */
	@Column({ type: 'varchar', length: 64, nullable: true })
	model: string;

	/**
	 * The tools available to the agent as JSON `INode` definitions.
	 */
	@JsonColumn({ default: '[]' })
	tools: INode[];
}
