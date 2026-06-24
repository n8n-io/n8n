import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { Category } from './Category';
import { PrimaryColumn } from '../../../../../src';

@Entity()
export class Post {
	@PrimaryColumn()
	categoryId: number;

	@ManyToOne(
		(type) => Category,
		(category) => category.posts,
		{
			cascade: ['insert'],
		},
	)
	category: Category;

	@Column()
	title: string;
}
