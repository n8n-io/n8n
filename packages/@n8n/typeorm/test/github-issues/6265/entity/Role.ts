import { Entity } from '../../../../src/decorator/entity/Entity';
import { OneToMany, Column, DeleteDateColumn, PrimaryGeneratedColumn } from '../../../../src';
import { User } from './User';

@Entity()
export class Role {
	@PrimaryGeneratedColumn()
	id: string;

	@Column()
	title: string;

	@OneToMany(
		(_) => User,
		(user) => user.role,
		{ cascade: true },
	)
	users: User[];

	@DeleteDateColumn()
	deleteDate?: Date;
}
