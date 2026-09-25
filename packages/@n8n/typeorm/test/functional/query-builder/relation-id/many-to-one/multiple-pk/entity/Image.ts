import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../../../../src/decorator/relations/OneToMany';
import { Category } from './Category';

@Entity()
export class Image {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		(type) => Category,
		(category) => category.image,
	)
	categories: Category[];

	categoryIds: number[];
}
