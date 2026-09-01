import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../../src/decorator/relations/JoinColumn';
import { RelationId } from '../../../../../../src/decorator/relations/RelationId';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	@ManyToOne((type) => Category)
	@JoinColumn()
	category: Category;

	@ManyToOne((type) => Category)
	@JoinColumn({ referencedColumnName: 'name' })
	categoryByName: Category;

	@RelationId((post: Post) => post.category)
	categoryId: number;

	@RelationId((post: Post) => post.categoryByName)
	categoryName: string;
}
