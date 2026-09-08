import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';
import { Post } from './Post';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		(type) => Post,
		(post) => post.category,
	)
	posts: Post[];
}
