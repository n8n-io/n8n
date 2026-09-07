import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';
import { RelationCount } from '../../../../../../src/decorator/relations/RelationCount';
import { Image } from './Image';
import { Post } from './Post';

@Entity()
export class Category {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	isRemoved: boolean = false;

	@ManyToOne(
		(type) => Post,
		(post) => post.categories,
	)
	post: Post;

	@OneToMany(
		(type) => Image,
		(image) => image.category,
	)
	images: Image[];

	@RelationCount((category: Category) => category.images)
	imageCount: number;

	@RelationCount(
		(category: Category) => category.images,
		'removedImages',
		(qb) =>
			qb.andWhere('removedImages.isRemoved = :isRemoved', {
				isRemoved: true,
			}),
	)
	removedImageCount: number;
}
