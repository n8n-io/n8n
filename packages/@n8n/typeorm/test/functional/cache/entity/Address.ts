import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';
import { User } from './User';

@Entity()
export class Address {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	address: string;

	@ManyToOne(
		() => User,
		(u) => u.addresses,
	)
	user: User;
}
