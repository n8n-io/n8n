import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../../../../src/decorator/relations/OneToOne';
import { Category } from './Category';
import { PrimaryColumn } from '../../../../../../../src';

@Entity()
export class Image {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@OneToOne(
		(type) => Category,
		(category) => category.image,
	)
	category: Category;

	categoryId: number;
}
