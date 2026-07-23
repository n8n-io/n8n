import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';
import { RelationCount } from '../../../../../../src/decorator/relations/RelationCount';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	@OneToMany(
		(type) => Category,
		(category) => category.post,
	)
	categories: Category[];

	@RelationCount((post: Post) => post.categories)
	categoryCount: number;

	@RelationCount(
		(post: Post) => post.categories,
		'rc',
		(qb) => qb.andWhere('rc.isRemoved = :isRemoved', { isRemoved: true }),
	)
	removedCategoryCount: number;
}
