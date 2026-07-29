import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../../src/decorator/relations/OneToOne';
import { Category } from './Category';

@Entity()
export class CategoryMetadata {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	keyword: string;

	@OneToOne(
		(type) => Category,
		(category) => category.metadata,
	)
	category: Category;
}
