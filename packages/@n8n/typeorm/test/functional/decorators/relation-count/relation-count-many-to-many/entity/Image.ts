import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../src/decorator/relations/ManyToMany';
import { RelationCount } from '../../../../../../src/decorator/relations/RelationCount';
import { Category } from './Category';

@Entity()
export class Image {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	isRemoved: boolean = false;

	@ManyToMany(
		(type) => Category,
		(category) => category.images,
	)
	categories: Category[];

	@RelationCount((image: Image) => image.categories)
	categoryCount: number;
}
