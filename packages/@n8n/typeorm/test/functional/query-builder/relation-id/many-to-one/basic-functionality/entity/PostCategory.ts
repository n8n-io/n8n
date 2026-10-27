import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { Post } from './Post';
import { Category } from './Category';
import { Image } from './Image';
import { PrimaryColumn } from '../../../../../../../src';

@Entity()
export class PostCategory {
	@PrimaryColumn()
	postId: number;

	@PrimaryColumn()
	categoryId: number;

	@ManyToOne(
		(type) => Post,
		(post) => post.categories,
	)
	post: Post;

	@ManyToOne(
		(type) => Category,
		(category) => category.posts,
	)
	category: Category;

	@ManyToOne((type) => Image)
	image: Image;

	imageId: number;
}
