import { Category } from './Category';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { OneToMany } from '../../../../../src/decorator/relations/OneToMany';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../src';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@OneToMany(
		(type) => Category,
		(category) => category.post,
	)
	categories: Category[] | null;

	@Column()
	title: string;
}
