import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';
import { Author } from './Author';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	text: string;

	@ManyToOne((type) => Author, { cascade: true, nullable: false })
	author: Author;
}
