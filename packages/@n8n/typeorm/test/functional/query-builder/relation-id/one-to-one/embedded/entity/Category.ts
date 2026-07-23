import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Post } from './Post';
import { OneToOne } from '../../../../../../../src/decorator/relations/OneToOne';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToOne(
		(type) => Post,
		(post) => post.counters.category,
	)
	post: Post;

	postId: number;
}
