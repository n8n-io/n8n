import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: 'category_id' })
	categoryId: number;

	@ManyToOne(() => Category)
	@JoinColumn({ name: 'category_id' })
	category: Category;
}
