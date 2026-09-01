import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';
import { OneToMany } from '../../../../../../../src/decorator/relations/OneToMany';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
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

	@OneToMany(
		(type) => Post,
		(post) => post.category,
	)
	posts: Post[];

	@ManyToOne(
		(type) => Image,
		(image) => image.categories,
	)
	@JoinTable()
	image: Image;

	postIds: number[];

	imageId: number[];
}
