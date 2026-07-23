import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../../src/decorator/relations/JoinColumn';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToOne((type) => Category)
	category: Category;

	@ManyToOne((type) => Category)
	@JoinColumn()
	categoryWithJoinColumn: Category;

	@ManyToOne((type) => Category)
	@JoinColumn([
		{ name: 'category_name', referencedColumnName: 'name' },
		{ name: 'category_type', referencedColumnName: 'type' },
	])
	categoryWithOptions: Category;

	@ManyToOne((type) => Category)
	@JoinColumn([
		{ name: 'category_code', referencedColumnName: 'code' },
		{ name: 'category_version', referencedColumnName: 'version' },
		{ name: 'category_description', referencedColumnName: 'description' },
	])
	categoryWithNonPKColumns: Category;
}
