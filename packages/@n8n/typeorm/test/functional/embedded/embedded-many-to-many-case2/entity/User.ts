import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { Post } from './Post';
import { JoinTable } from '../../../../../src/decorator/relations/JoinTable';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(
		(type) => Post,
		(post) => post.counters.likedUsers,
	)
	@JoinTable()
	likedPosts: Post[];
}
