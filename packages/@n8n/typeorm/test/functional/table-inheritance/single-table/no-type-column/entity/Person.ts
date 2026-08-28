import * as TypeOrm from '../../../../../../src';
import { Note } from './Note';

@TypeOrm.Entity({ name: 'person' })
export class Person {
	@TypeOrm.PrimaryGeneratedColumn()
	public id: number;

	@TypeOrm.Column()
	public name: string;

	@TypeOrm.OneToMany(
		() => Note,
		(note) => note.owner,
	)
	public notes: Note[];
}
