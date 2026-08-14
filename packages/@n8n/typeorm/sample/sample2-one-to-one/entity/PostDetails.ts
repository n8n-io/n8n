import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from '../../../src/index';
import { Post } from './Post';

@Entity('sample2_post_details')
export class PostDetails {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	authorName: string;

	@Column()
	comment: string;

	@Column()
	metadata: string;

	@OneToOne(
		(type) => Post,
		(post) => post.details,
		{
			cascade: true,
		},
	)
	post: Post;
}
