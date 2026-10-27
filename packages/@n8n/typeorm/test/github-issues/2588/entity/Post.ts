import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from '../../../../src';
import { PostReview } from './PostReview';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToMany(
		(type) => PostReview,
		(postReview) => postReview.post,
		{
			eager: true,
		},
	)
	reviews: PostReview[];
}
