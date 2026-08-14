import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from '../../../../src';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToMany(
		() => Category,
		(o) => o.posts,
		{
			cascade: true,
		},
	)
	@JoinTable()
	categories!: Promise<Category[]>;
}
