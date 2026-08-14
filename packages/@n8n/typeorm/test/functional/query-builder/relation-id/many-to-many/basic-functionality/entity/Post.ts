import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';
import { Category } from './Category';
import { Tag } from './Tag';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToOne((type) => Tag)
	tag: Tag;

	tagId: number;

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
