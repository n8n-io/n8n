import { Column } from '../../../../../src/decorator/columns/Column';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Post } from './Post';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@PrimaryColumn()
	personId: number;

	@Column()
	name: string;

	@ManyToMany(
		(type) => Post,
		(post) => post.counters.likedUsers,
	)
	likedPosts: Post[];
}
