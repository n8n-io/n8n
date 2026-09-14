import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Todo } from './todo';

@Entity({ name: 'person' })
export class Person {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column('varchar')
	name: string;

	@OneToMany(
		() => Todo,
		(o) => o.owner,
	)
	todos: Todo[];
}
