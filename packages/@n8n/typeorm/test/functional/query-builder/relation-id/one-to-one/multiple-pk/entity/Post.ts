import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { OneToOne } from '../../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../../src/decorator/relations/JoinColumn';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@PrimaryColumn()
	authorId: number;

	@Column()
	title: string;

	@Column()
	isRemoved: boolean = false;

	@OneToOne(
		(type) => Category,
		(category) => category.post,
	)
	@JoinColumn()
	category: Category;

	@OneToOne((type) => Category)
	@JoinColumn()
	subcategory: Category;

	categoryId: number;
}
