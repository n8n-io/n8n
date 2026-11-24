import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Post } from './Post';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Post,
		(post) => post.categories,
	)
	post: Post;
}
