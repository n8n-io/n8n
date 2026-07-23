import { Column, ManyToMany, Entity, PrimaryGeneratedColumn } from '../../../../src';
import { Post } from './Post';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(
		() => Post,
		(o) => o.categories,
	)
	posts!: Promise<Post[]>;

	addedProp: boolean = false;
}
