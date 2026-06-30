import {
	Column,
	Entity,
	JoinTable,
	ManyToMany,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
} from '../../../../src/index';
import { Message } from './Message';
import { User } from './User';

export interface ChatConstructor {
	name?: string;
	picture?: string;
	allTimeMembers?: User[];
	listingMembers?: User[];
	actualGroupMembers?: User[];
	admins?: User[];
	owner?: User;
	messages?: Message[];
}

@Entity()
export class Chat {
	constructor({
		name,
		picture,
		allTimeMembers,
		listingMembers,
		actualGroupMembers,
		admins,
		owner,
		messages,
	}: ChatConstructor = {}) {
		if (name) {
			this.name = name;
		}
		if (picture) {
			this.picture = picture;
		}
		if (allTimeMembers) {
			this.allTimeMembers = allTimeMembers;
		}
		if (listingMembers) {
			this.listingMembers = listingMembers;
		}
		if (actualGroupMembers) {
			this.actualGroupMembers = actualGroupMembers;
		}
		if (admins) {
			this.admins = admins;
		}
		if (owner) {
			this.owner = owner;
		}
		if (messages) {
			this.messages = messages;
		}
	}

	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true })
	name?: string;

	@Column({ nullable: true })
	picture?: string;

	@ManyToMany(
		() => User,
		(user) => user.allTimeMemberChats,
		{ eager: true },
	)
	@JoinTable()
	allTimeMembers: User[];

	@ManyToMany(
		() => User,
		(user) => user.listedMemberChats,
		{ eager: true },
	)
	@JoinTable()
	listingMembers: User[];

	@ManyToMany(
		() => User,
		(user) => user.actualGroupMemberChats,
		{
			eager: true,
		},
	)
	@JoinTable()
	actualGroupMembers?: User[];

	@ManyToMany(
		() => User,
		(user) => user.adminChats,
		{ eager: true },
	)
	@JoinTable()
	admins?: User[];

	@ManyToOne(
		() => User,
		(user) => user.ownerChats,
		{ eager: true },
	)
	owner?: User;

	@OneToMany(
		() => Message,
		(message) => message.chat,
		{
			cascade: true,
			eager: true,
		},
	)
	messages: Message[];
}
