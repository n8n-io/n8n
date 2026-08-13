import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from '../../../src/index';
import { Post } from './Post';

@Entity('sample2_post_image')
export class PostImage {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	url: string;

	@OneToOne(
		(type) => Post,
		(post) => post.image,
	)
	post: Post;
}
