import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../src';
import { Address } from './Address';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	firstName: string;

	@Column()
	lastName: string;

	@Column()
	isAdmin: boolean;

	@OneToMany(
		() => Address,
		(a) => a.user,
	)
	addresses: Address[];
}
