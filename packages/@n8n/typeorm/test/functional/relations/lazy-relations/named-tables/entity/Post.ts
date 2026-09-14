import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../../src/decorator/relations/JoinTable';
import { ManyToOne } from '../../../../../../src/decorator/relations/ManyToOne';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../src/decorator/relations/JoinColumn';
import { Category } from './Category';

@Entity('s_post', {
	orderBy: {
		title: 'ASC',
		id: 'DESC',
	},
})
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	text: string;

	@ManyToMany((type) => Category)
	@JoinTable()
	categories: Promise<Category[]>;

	@ManyToMany(
		(type) => Category,
		(category) => category.twoSidePosts,
	)
	@JoinTable()
	twoSideCategories: Promise<Category[]>;

	@Column()
	viewCount: number = 0;

	@ManyToOne((type) => Category)
	category: Promise<Category>;

	@OneToOne(
		(type) => Category,
		(category) => category.onePost,
	)
	@JoinColumn()
	oneCategory: Promise<Category>;

	@ManyToOne(
		(type) => Category,
		(category) => category.twoSidePosts2,
	)
	twoSideCategory: Promise<Category>;

	// ManyToMany with named properties
	@ManyToMany(
		(type) => Category,
		(category) => category.postsNamedTable,
	)
	@JoinTable()
	categoriesNamedTable: Promise<Category[]>;

	// ManyToOne with named properties
	@ManyToOne(
		(type) => Category,
		(category) => category.onePostsNamedTable,
	)
	@JoinColumn()
	categoryNamedTable: Promise<Category>;

	// OneToOne with named properties
	@OneToOne(
		(type) => Category,
		(category) => category.onePostNamedTable,
	)
	@JoinColumn()
	oneCategoryNamedTable: Promise<Category>;
}
