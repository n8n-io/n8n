import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
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

	@ManyToMany(
		(type) => Category,
		(category) => category.posts,
	)
	@JoinTable()
	categories: Category[];

	@ManyToMany((type) => Category)
	@JoinTable()
	subcategories: Category[];

	categoryIds: number[];
}
