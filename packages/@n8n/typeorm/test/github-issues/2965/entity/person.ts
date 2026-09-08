import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from '../../../../src/';
import { Note } from './note';

@Entity()
export class Person {
	@PrimaryGeneratedColumn()
	public id: number;

	@Column()
	public name: string;

	@OneToMany(
		(type) => Note,
		(note) => note.owner,
		{ lazy: true },
	)
	public notes: Promise<Note[]> | Note[];
}
