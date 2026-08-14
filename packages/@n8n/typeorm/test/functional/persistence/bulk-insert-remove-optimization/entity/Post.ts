import { Category } from './Category';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../src/decorator/relations/JoinTable';
import { PrimaryColumn } from '../../../../../src';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	@ManyToMany(
		(type) => Category,
		(category) => category.posts,
		{
			cascade: ['insert'],
		},
	)
	@JoinTable()
	categories: Category[];
}
