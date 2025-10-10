import { WithTimestampsAndStringId, DateTimeColumn, User } from '@n8n/db';
import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from '@n8n/typeorm';

import type { ChatMessage } from './chat-message.entity';

@Entity({ name: 'chat_sessions' })
export class ChatSession extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 256 })
	name: string;

	@Column({ type: 'varchar', length: 36 })
	userId: string;

	@ManyToOne('User', 'chatSessions')
	@JoinColumn({ name: 'userId' })
	user: User;

	@DateTimeColumn({ nullable: true })
	lastMessageAt: Date | null;

	@OneToMany('ChatMessage', 'session')
	messages: ChatMessage[];
}
