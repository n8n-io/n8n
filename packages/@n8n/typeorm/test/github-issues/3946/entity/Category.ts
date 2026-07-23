import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { Post } from './Post';
import { Image } from './Image';
import { JoinTable } from '../../../../src/decorator/relations/JoinTable';

@Entity()
export class Category {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;

	@Column()
	isRemoved: boolean = false;

	@ManyToMany(
		(type) => Post,
		(post) => post.categories,
	)
	posts: Post[];

	@ManyToMany(
		(type) => Image,
		(image) => image.categories,
	)
	@JoinTable()
	images: Image[];

	postCount: number;

	removedPostCount: number;

	imageCount: number;

	removedImageCount: number;
}
