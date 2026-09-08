import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';
import { Category } from './Category';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ nullable: true })
	categoryName: string;

	@OneToOne(
		(type) => Category,
		(category) => category.post,
	)
	@JoinColumn({ name: 'categoryName', referencedColumnName: 'name' })
	category: Category;
}
