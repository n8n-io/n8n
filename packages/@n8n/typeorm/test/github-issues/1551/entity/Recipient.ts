import { CreateDateColumn, Entity, ManyToOne, PrimaryColumn } from '../../../../src/index';
import { Message } from './Message';
import { User } from './User';

export interface RecipientConstructor {
	user?: User;
	message?: Message;
	receivedAt?: number;
	readAt?: number;
}

@Entity()
export class Recipient {
	constructor({ user, message, receivedAt, readAt }: RecipientConstructor = {}) {
		if (user) {
			this.user = user;
		}
		if (message) {
			this.message = message;
		}
		if (receivedAt) {
			this.receivedAt = receivedAt;
		}
		if (readAt) {
			this.readAt = readAt;
		}
	}

	@PrimaryColumn()
	userId: number;

	@PrimaryColumn()
	messageId: number;

	@ManyToOne(
		(type) => User,
		(user) => user.recipients,
	)
	user: User;

	@ManyToOne(
		(type) => Message,
		(message) => message.recipients,
	)
	message: Message;

	@CreateDateColumn()
	receivedAt: number;

	@CreateDateColumn()
	readAt: number;
}
