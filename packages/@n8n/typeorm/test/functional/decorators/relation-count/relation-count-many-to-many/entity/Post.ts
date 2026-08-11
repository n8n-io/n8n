import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../../src/decorator/relations/JoinTable';
import { RelationCount } from '../../../../../../src/decorator/relations/RelationCount';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	isRemoved: boolean = false;

	@ManyToMany(
		(type) => Category,
		(category) => category.posts,
	)
	@JoinTable()
	categories: Category[];

	@RelationCount((post: Post) => post.categories)
	categoryCount: number;

	@RelationCount(
		(post: Post) => post.categories,
		'removedCategories',
		(qb) =>
			qb.andWhere('removedCategories.isRemoved = :isRemoved', {
				isRemoved: true,
			}),
	)
	removedCategoryCount: number;
}
