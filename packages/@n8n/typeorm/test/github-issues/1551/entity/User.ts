import {
	Column,
	Entity,
	ManyToMany,
	OneToMany,
	PrimaryGeneratedColumn,
} from '../../../../src/index';
import { Chat } from './Chat';
import { Message } from './Message';
import { Recipient } from './Recipient';

export interface UserConstructor {
	username?: string;
	password?: string;
	name?: string;
	picture?: string;
	phone?: string;
}

@Entity()
export class User {
	constructor({ username, password, name, picture, phone }: UserConstructor = {}) {
		if (username) {
			this.username = username;
		}
		if (password) {
			this.password = password;
		}
		if (name) {
			this.name = name;
		}
		if (picture) {
			this.picture = picture;
		}
		if (phone) {
			this.phone = phone;
		}
	}

	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	username: string;

	@Column()
	password: string;

	@Column()
	name: string;

	@Column({ nullable: true })
	picture?: string;

	@Column({ nullable: true })
	phone?: string;

	@ManyToMany(
		(type) => Chat,
		(chat) => chat.allTimeMembers,
	)
	allTimeMemberChats: Chat[];

	@ManyToMany(
		(type) => Chat,
		(chat) => chat.listingMembers,
	)
	listedMemberChats: Chat[];

	@ManyToMany(
		(type) => Chat,
		(chat) => chat.actualGroupMembers,
	)
	actualGroupMemberChats: Chat[];

	@ManyToMany(
		(type) => Chat,
		(chat) => chat.admins,
	)
	adminChats: Chat[];

	@ManyToMany(
		(type) => Message,
		(message) => message.holders,
	)
	holderMessages: Message[];

	@OneToMany(
		(type) => Chat,
		(chat) => chat.owner,
	)
	ownerChats: Chat[];

	@OneToMany(
		(type) => Message,
		(message) => message.sender,
	)
	senderMessages: Message[];

	@OneToMany(
		(type) => Recipient,
		(recipient) => recipient.user,
	)
	recipients: Recipient[];
}
