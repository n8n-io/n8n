import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { Category } from './Category';
import { OneToMany } from '../../../../../../../src/decorator/relations/OneToMany';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@PrimaryColumn()
	authorId: number;

	@Column()
	title: string;

	@OneToMany(
		(type) => Category,
		(category) => category.post,
	)
	categories: Category[];

	categoryIds: any[];
}
