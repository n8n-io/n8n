import { Chat } from './Chat';
import { User } from './User';
import { Recipient } from './Recipient';
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinTable,
	ManyToMany,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
} from '../../../../src/index';

export enum MessageType {
	TEXT,
	LOCATION,
	PICTURE,
}

export interface MessageConstructor {
	sender?: User;
	content?: string;
	type?: MessageType;
	recipients?: Recipient[];
	holders?: User[];
	chat?: Chat;
}

@Entity()
export class Message {
	constructor({ sender, content, type, recipients, holders, chat }: MessageConstructor = {}) {
		if (sender) {
			this.sender = sender;
		}
		if (content) {
			this.content = content;
		}
		if (type) {
			this.type = type;
		}
		if (recipients) {
			recipients.forEach((recipient) => (recipient.message = this));
			this.recipients = recipients;
			// this.recipients = recipients.map(recipient => (new Recipient({...recipient, message: this})));
		}
		if (holders) {
			this.holders = holders;
		}
		if (chat) {
			this.chat = chat;
		}
	}

	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(
		(type) => User,
		(user) => user.senderMessages,
		{ eager: true },
	)
	sender: User;

	@Column()
	content: string;

	@CreateDateColumn()
	createdAt: number;

	@Column({ nullable: true })
	type: MessageType;

	@OneToMany(
		(type) => Recipient,
		(recipient) => recipient.message,
		{
			cascade: true,
			eager: true,
		},
	)
	recipients: Recipient[];

	@ManyToMany(
		(type) => User,
		(user) => user.holderMessages,
		{ eager: true },
	)
	@JoinTable()
	holders: User[];

	@ManyToOne(
		(type) => Chat,
		(chat) => chat.messages,
	)
	chat: Chat;
}
