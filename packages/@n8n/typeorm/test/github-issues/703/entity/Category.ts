import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';
import { Post } from './Post';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { RelationId } from '../../../../src/decorator/relations/RelationId';

@Entity()
export class Category {
	@PrimaryColumn()
	firstId: number;

	@PrimaryColumn()
	secondId: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Post,
		(post) => post.categories,
	)
	post: Post;

	@RelationId((category: Category) => category.post)
	postId: number;
}
