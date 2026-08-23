import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Post } from './Post';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	name: string;

	@OneToOne(
		(type) => Post,
		(post) => post.category,
	)
	post: Post;
}
