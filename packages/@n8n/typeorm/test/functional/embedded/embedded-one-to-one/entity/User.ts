import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Post } from './Post';
import { OneToOne } from '../../../../../src/decorator/relations/OneToOne';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@OneToOne(
		() => Post,
		(post) => post.counters.likedUser,
	)
	likedPost: Post;
}
