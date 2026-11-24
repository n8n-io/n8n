import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Post } from './Post';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(
		(type) => Post,
		(post) => post.counters.categories,
	)
	posts: Post[];

	postIds: number[];
}
