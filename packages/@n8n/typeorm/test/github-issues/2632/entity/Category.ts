import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Post } from './Post';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToMany(
		(type) => Post,
		(post) => post.categories,
	)
	posts: Post[];
}
