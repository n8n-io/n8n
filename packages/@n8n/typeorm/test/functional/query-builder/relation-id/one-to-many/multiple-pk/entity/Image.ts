import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { Category } from './Category';

@Entity()
export class Image {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Category,
		(category) => category.images,
	)
	category: Category;

	categoryId: number;
}
