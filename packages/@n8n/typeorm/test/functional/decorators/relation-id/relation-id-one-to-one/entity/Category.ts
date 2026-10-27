import { Column } from '../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { RelationId } from '../../../../../../src/decorator/relations/RelationId';
import { Post } from './Post';

@Entity()
export class Category {
	@PrimaryColumn()
	id: number;

	@Column({ unique: true })
	name: string;

	@OneToOne(
		(type) => Post,
		(post) => post.category2,
	)
	post: Post;

	@RelationId((category: Category) => category.post)
	postId: number;
}
