import { Entity } from '../../../../../src/decorator/entity/Entity';
import { OneToMany } from '../../../../../src/decorator/relations/OneToMany';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Post } from './Post';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@PrimaryColumn()
	personId: number;

	@Column()
	name: string;

	@OneToMany(
		(type) => Post,
		(post) => post.counters.likedUser,
	)
	likedPosts: Post[];
}
