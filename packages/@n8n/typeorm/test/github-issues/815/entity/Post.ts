import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../src/decorator/relations/OneToMany';
import { Category } from './Category';
import { RelationId } from '../../../../src/decorator/relations/RelationId';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../src/decorator/relations/JoinTable';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToMany(
		(type) => Category,
		(category) => category.post,
	)
	categories: Category[];

	@RelationId((post: Post) => post.categories)
	categoryIds: { firstId: number; secondId: number }[];

	@ManyToMany(
		(type) => Category,
		(category) => category.manyPosts,
	)
	@JoinTable()
	manyCategories: Category[];

	@RelationId((post: Post) => post.manyCategories)
	manyCategoryIds: { firstId: number; secondId: number }[];
}
