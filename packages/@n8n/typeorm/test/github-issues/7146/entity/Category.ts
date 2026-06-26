import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from '../../../../src';
import { Post } from './Post';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToOne(
		(type) => Post,
		(post) => post.lazyOneToOne,
		{
			nullable: true,
			eager: false,
		},
	)
	@JoinColumn()
	backRef1: Post;

	@OneToOne(
		(type) => Post,
		(post) => post.eagerOneToOne,
		{
			nullable: true,
			eager: false,
		},
	)
	@JoinColumn()
	backRef2: Post;
}
