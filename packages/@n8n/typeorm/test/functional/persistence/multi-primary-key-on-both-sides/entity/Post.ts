import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryColumn()
	firstId: number;

	@PrimaryColumn()
	secondId: number;

	@Column()
	title: string;

	@ManyToOne(
		(type) => Category,
		(category) => category.posts,
	)
	category: Category;
}
