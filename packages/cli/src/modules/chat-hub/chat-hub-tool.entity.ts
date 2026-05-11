import { User, JsonColumn, WithTimestamps } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn, PrimaryColumn } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';

export interface IChatHubTool {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	name: string;
	type: string;
	typeVersion: number;
	ownerId: string;
	definition: INode;
	enabled: boolean;
}

@Entity({ name: 'chat_hub_tools' })
export class ChatHubTool extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	/**
	 * The name of the tool, denormalized from definition for unique constraint.
	 */
	@Column({ type: 'varchar', length: 255 })
	name: string;

	/**
	 * The node type of the tool, denormalized from definition.
	 */
	@Column({ type: 'varchar', length: 255 })
	type: string;

	/**
	 * The node type version of the tool, denormalized from definition.
	 */
	@Column({ type: 'double precision' })
	typeVersion: number;

	/**
	 * ID of the user that owns this tool.
	 */
	@Column({ type: String })
	ownerId: string;

	/**
	 * The user that owns this tool.
	 */
	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'ownerId' })
	owner?: User;

	/**
	 * The full INode definition of the tool.
	 */
	@JsonColumn()
	definition: INode;

	/**
	 * Whether the tool is enabled by default for new sessions.
	 */
	@Column({ type: 'boolean', default: true })
	enabled: boolean;
}
