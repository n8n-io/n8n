import { OneToOne } from '../../../../../src/decorator/relations/OneToOne';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { RelationCount } from '../../../../../src/decorator/relations/RelationCount';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { Category } from './Category';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@OneToOne((type) => Category)
	category: Category;

	@ManyToMany((type) => Category)
	category2: Category;

	@RelationCount((post: Post) => post.category)
	categoryCount: number;

	@RelationCount((post: Post) => post.category2)
	categoryCount2: number;
}
