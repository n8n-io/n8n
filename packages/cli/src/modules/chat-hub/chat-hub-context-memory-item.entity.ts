import { User, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	ManyToOne,
	JoinColumn,
	type Relation,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';

import type { ChatHubMessage } from './chat-hub-message.entity';
import type { ChatHubSession } from './chat-hub-session.entity';

export interface IChatHubContextMemoryItem {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	userId: string;
	sessionId: string;
	messageId: string;
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
	 * ID of the session where this memory item was extracted from.
	 */
	@Column({ type: String })
	sessionId: string;

	/**
	 * The session where this memory item was extracted from.
	 */
	@ManyToOne('ChatHubSession')
	@JoinColumn({ name: 'sessionId' })
	session?: Relation<ChatHubSession>;

	/**
	 * ID of the message where this memory item was extracted from.
	 */
	@Column({ type: String })
	messageId: string;

	/**
	 * The message where this memory item was extracted from.
	 */
	@ManyToOne('ChatHubMessage')
	@JoinColumn({ name: 'messageId' })
	message?: Relation<ChatHubMessage>;

	/**
	 * The memory item stored as plain text.
	 */
	@Column('text')
	item: string;
}
