import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from '../../../../src';
import { User } from './User';

@Entity()
export class Document {
	@PrimaryColumn('uuid')
	id: string;

	@ManyToOne(
		() => User,
		(user) => user.docs,
		{ onDelete: 'CASCADE' },
	)
	@JoinColumn({ name: 'ownerId' })
	owner: User;
}
