import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from '../../../src/index';
import { Post } from './Post';

@Entity('sample3_post_metadata')
export class PostMetadata {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	description: string;

	@OneToMany(
		(type) => Post,
		(post) => post.metadata,
	)
	posts: Post[];
}
