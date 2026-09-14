import { PrimaryGeneratedColumn, JoinTable, ManyToMany, Entity } from '../../../../src';
import { Book } from './Book';

@Entity('author')
export class Author {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToMany(
		() => Book,
		(book) => book.authors,
		{
			onDelete: 'CASCADE',
			onUpdate: 'CASCADE',
		},
	)
	@JoinTable({
		name: 'author_to_books',
		joinColumn: {
			name: 'author_id',
			referencedColumnName: 'id',
		},
		inverseJoinColumn: {
			name: 'book_id',
			referencedColumnName: 'id',
		},
	})
	books: Book[];
}
