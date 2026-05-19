import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { Post } from './Post';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';
import { Category } from './Category';
import { PrimaryColumn } from '../../../../src';

@Entity()
export class PostCategory {
	@PrimaryColumn()
	postId: number;

	@PrimaryColumn()
	categoryId: number;

	@ManyToOne(
		(type) => Post,
		(post) => post.categories,
		{
			cascade: ['insert'],
		},
	)
	post: Post;

	@ManyToOne(
		(type) => Category,
		(category) => category.posts,
		{
			cascade: ['insert'],
		},
	)
	category: Category;

	@Column()
	addedByAdmin: boolean;

	@Column()
	addedByUser: boolean;
}
