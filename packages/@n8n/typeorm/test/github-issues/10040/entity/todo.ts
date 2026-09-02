import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';
import { Person } from './person';

@Entity({ name: 'todo' })
export class Todo {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column('varchar')
	description: string;

	@ManyToOne(
		() => Person,
		(o) => o.todos,
	)
	owner: Person;
}
