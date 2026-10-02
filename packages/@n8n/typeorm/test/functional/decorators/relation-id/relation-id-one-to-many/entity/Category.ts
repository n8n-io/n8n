import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';
import { RelationId } from '../../../../../../src/decorator/relations/RelationId';
import { Post } from './Post';

@Entity()
export class Category {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		(type) => Post,
		(post) => post.category,
	)
	posts: Post[];

	@RelationId((category: Category) => category.posts)
	postIds: number[];

	@RelationId(
		(category: Category) => category.posts,
		'removedPosts',
		(qb) => qb.andWhere('removedPosts.isRemoved = :isRemoved', { isRemoved: true }),
	)
	removedPostIds: number[];
}
