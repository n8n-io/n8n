import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn, OneToMany } from '../../../../src';
import { User } from './User';

@Entity()
export class Role {
	@PrimaryColumn()
	id: string;

	@OneToMany(
		(_) => User,
		(user) => user.role,
		{ cascade: true },
	)
	users: User[];
}
