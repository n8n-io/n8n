import { Column } from '../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	isRemoved: boolean = false;

	@ManyToOne((type) => Category)
	category: Category;

	categoryId: number;
}
