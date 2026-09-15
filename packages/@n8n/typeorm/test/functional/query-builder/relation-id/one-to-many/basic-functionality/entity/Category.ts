import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { OneToMany } from '../../../../../../../src/decorator/relations/OneToMany';
import { Image } from './Image';
import { Post } from './Post';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	isRemoved: boolean = false;

	@OneToMany(
		(type) => Image,
		(image) => image.category,
	)
	images: Image[];

	imageIds: number[];

	@ManyToOne(
		(type) => Post,
		(post) => post.categories,
	)
	post: Post;

	postId: number;
}
