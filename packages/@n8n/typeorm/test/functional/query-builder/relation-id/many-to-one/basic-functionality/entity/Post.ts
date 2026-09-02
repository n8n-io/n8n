import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../../../src/decorator/relations/JoinColumn';
import { OneToMany } from '../../../../../../../src/decorator/relations/OneToMany';
import { Category } from './Category';
import { PostCategory } from './PostCategory';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToOne((type) => Category)
	@JoinColumn({ referencedColumnName: 'name' })
	categoryByName: Category;

	@ManyToOne((type) => Category)
	@JoinColumn()
	category: Category;

	@OneToMany(
		(type) => PostCategory,
		(postCategoryRelation) => postCategoryRelation.post,
	)
	categories: PostCategory[];

	categoryId: number;

	categoryName: string;
}
