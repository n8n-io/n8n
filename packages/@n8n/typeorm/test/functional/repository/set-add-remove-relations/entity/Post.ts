import { Category } from './Category';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../../src/decorator/relations/OneToMany';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../src/decorator/relations/JoinTable';

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
	categories: Category[] | null;

	@ManyToMany(
		(type) => Category,
		(category) => category.manyPosts,
	)
	@JoinTable()
	manyCategories: Category[];
}
