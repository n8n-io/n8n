import { Column, Entity, OneToMany, PrimaryColumn } from '../../../../src';
import { Post } from './Post';

@Entity()
export class Author {
	@PrimaryColumn()
	id: number;

	@Column()
	firstName: string;

	@Column()
	lastName: string;

	@Column()
	age: number;

	@OneToMany(
		() => Post,
		(post) => post.author,
	)
	posts: Post[];
}
