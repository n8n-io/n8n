import { Category } from './Category';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column('int', { nullable: true })
	categoryId: number;

	@ManyToOne(
		(type) => Category,
		(category) => category.posts,
		{
			cascade: true,
		},
	)
	@JoinColumn({ name: 'categoryId' })
	category: Category;
}
