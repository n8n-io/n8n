import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Category } from './Category';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../src/decorator/relations/JoinTable';
import { Tag } from './Tag';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToOne(
		() => Category,
		(category) => category.posts,
		{
			cascade: ['insert'],
		},
	)
	category: Promise<Category>;

	@ManyToMany(
		(type) => Tag,
		(tag) => tag.posts,
		{
			cascade: ['insert'],
		},
	)
	@JoinTable()
	tags: Promise<Tag[]>;
}
