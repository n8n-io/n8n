import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../../src/decorator/relations/JoinColumn';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToOne((type) => Category)
	@JoinColumn()
	category: Category;

	@OneToOne(
		(type) => Category,
		(category) => category.post,
	)
	@JoinColumn()
	category2: Category;

	categoryId: number;
}
