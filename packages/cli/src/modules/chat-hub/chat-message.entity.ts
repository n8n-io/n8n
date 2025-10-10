import { WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn } from '@n8n/typeorm';

import { ChatSession } from './chat-session.entity';

export type ChatMessageType = 'human' | 'ai' | 'system' | 'tool' | 'generic';
export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool' | null;

@Entity({ name: 'chat_messages' })
export class ChatMessage extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 36 })
	sessionId: string;

	@ManyToOne('ChatSession', 'messages', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sessionId' })
	session: ChatSession;

	@Column({ type: 'varchar', length: 16 })
	type: ChatMessageType;

	@Column({ type: 'varchar', length: 16, nullable: true })
	role: ChatMessageRole;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column('text')
	content: string;

	@Column({ type: 'text', nullable: true })
	additionalKwargs: string | null;

	@Column({ type: 'text', nullable: true })
	toolCallId: string | null;
}
