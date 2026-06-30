import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../src/decorator/relations/JoinColumn';
import { Category } from './Category';
import { RelationId } from '../../../../../../src/decorator/relations/RelationId';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	@OneToOne((type) => Category)
	@JoinColumn()
	category: Category;

	@OneToOne((type) => Category)
	@JoinColumn({ referencedColumnName: 'name' })
	categoryByName: Category;

	@OneToOne(
		(type) => Category,
		(category) => category.post,
	)
	@JoinColumn()
	category2: Category;

	@RelationId((post: Post) => post.category)
	categoryId: number;

	@RelationId((post: Post) => post.categoryByName)
	categoryName: string;

	@RelationId((post: Post) => post.category2)
	category2Id: number;
}
