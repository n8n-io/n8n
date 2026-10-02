import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Post } from './Post';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		() => Post,
		(post) => post.categories,
		{
			onDelete: 'CASCADE',
		},
	)
	post: Post;
}
