import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from '../../../../../src';
import { Post } from './Post';

@Entity()
export class HeroImage {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	url: string;

	@OneToOne(
		() => Post,
		(post) => post.heroImage,
	)
	post: Post;
}
