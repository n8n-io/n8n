import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { Category } from './Category';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';

@Entity()
export class Image {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	isRemoved: boolean = false;

	@ManyToOne(
		(type) => Category,
		(category) => category.images,
	)
	category: Category[];
}
