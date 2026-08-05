import { Post } from './Post';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from '../../../../../src';

@Entity()
export class Tag {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(
		() => Post,
		(post) => post.tags,
	)
	posts: Post[];
}
