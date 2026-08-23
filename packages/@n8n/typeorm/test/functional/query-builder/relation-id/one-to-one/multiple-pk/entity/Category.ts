import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { Post } from './Post';
import { Image } from './Image';
import { OneToOne } from '../../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Category {
	@PrimaryColumn()
	id: number;

	@PrimaryColumn()
	code: number;

	@Column()
	name: string;

	@Column()
	isRemoved: boolean = false;

	@OneToOne(
		(type) => Post,
		(post) => post.category,
	)
	post: Post;

	@OneToOne(
		(type) => Image,
		(image) => image.category,
	)
	@JoinColumn()
	image: Image;

	postId: number;

	imageId: number;
}
