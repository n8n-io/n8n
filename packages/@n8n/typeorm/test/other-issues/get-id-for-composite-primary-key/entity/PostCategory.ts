import { CreateDateColumn, Entity, ManyToOne, PrimaryColumn } from '../../../../src';
import { Category } from './Category';
import { Post } from './Post';

@Entity()
export class PostCategory {
	@ManyToOne(() => Post)
	post!: Promise<Post>;
	@PrimaryColumn()
	postId!: Post['id'];

	@ManyToOne(() => Category)
	category!: Promise<Category>;
	@PrimaryColumn()
	categoryId!: Category['id'];

	@CreateDateColumn()
	added!: Date;
}
