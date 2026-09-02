import {
	Column,
	Entity,
	JoinColumn,
	OneToMany,
	OneToOne,
	PrimaryGeneratedColumn,
} from '../../../../src';
import { User } from './User';

@Entity()
export class Company {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToOne(() => User)
	@JoinColumn()
	admin: User;

	@OneToMany(
		() => User,
		(user) => user.company,
	)
	public staff?: Array<User>;
}
