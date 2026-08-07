import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from '../../../src/index';
import { Post } from './Post';

@Entity('sample3_post_author')
export class PostAuthor {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		(type) => Post,
		(post) => post.author,
	)
	posts: Post[];
}
