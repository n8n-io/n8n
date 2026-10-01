import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Post } from './Post';
import { OneToMany } from '../../../../src/decorator/relations/OneToMany';
import { DeleteDateColumn } from '../../../../src';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToMany(
		() => Post,
		(post) => post.category,
		{
			cascade: true,
			eager: true,
		},
	)
	posts: Post[];

	@DeleteDateColumn()
	deletedAt?: Date;
}
