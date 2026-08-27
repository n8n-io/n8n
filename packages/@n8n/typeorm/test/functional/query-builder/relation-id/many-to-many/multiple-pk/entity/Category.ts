import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';
import { Post } from './Post';
import { Image } from './Image';

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

	postIds: number[];

	imageIds: number[];
}
