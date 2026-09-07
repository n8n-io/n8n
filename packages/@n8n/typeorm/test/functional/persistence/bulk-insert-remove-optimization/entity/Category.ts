import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Post } from './Post';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { PrimaryColumn } from '../../../../../src';

@Entity()
export class Category {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(
		(type) => Post,
		(post) => post.categories,
	)
	posts: Post[];
}
