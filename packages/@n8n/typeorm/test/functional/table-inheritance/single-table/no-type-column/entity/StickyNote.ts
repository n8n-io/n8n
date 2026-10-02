import * as TypeOrm from '../../../../../../src';
import { Note } from './Note';
import { Author } from './Author';

@TypeOrm.ChildEntity()
export class StickyNote extends Note {
	@TypeOrm.Column()
	public stickyNoteLabel: string;

	@TypeOrm.ManyToOne(
		() => Author,
		(author) => author.notes,
	)
	public owner: Author;
}
