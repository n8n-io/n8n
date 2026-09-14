import { Column, Entity, ManyToMany, PrimaryColumn } from '../../../../../src';
import { Post } from './Post';

@Entity()
export class Tag {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(
		() => Post,
		(post) => post.tags,
	)
	posts: Post[];
}
