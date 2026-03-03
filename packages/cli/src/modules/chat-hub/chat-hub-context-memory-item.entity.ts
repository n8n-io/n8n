import { User, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	ManyToOne,
	JoinColumn,
	type Relation,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';

export interface IChatHubContextMemoryItem {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	userId: string;
	item: string;
}

@Entity({ name: 'chat_hub_context_memory_items' })
export class ChatHubContextMemoryItem extends WithTimestamps {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * ID of the user that owns this memory item.
	 */
	@Column({ type: String })
	userId: string;

	/**
	 * The user that owns this memory item.
	 */
	@ManyToOne('User', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user?: Relation<User>;

	/**
	 * The memory item stored as plain text.
	 */
	@Column('text')
	item: string;
}
