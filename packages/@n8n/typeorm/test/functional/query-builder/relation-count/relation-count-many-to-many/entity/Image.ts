import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../src/decorator/relations/ManyToMany';
import { Category } from './Category';

@Entity()
export class Image {
	@PrimaryGeneratedColumn()
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

	categoryCount: number;
}
