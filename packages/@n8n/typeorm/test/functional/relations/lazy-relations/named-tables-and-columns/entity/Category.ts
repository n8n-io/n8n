import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../src/decorator/relations/ManyToMany';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';
import { OneToOne } from '../../../../../../src/decorator/relations/OneToOne';
import { Post } from './Post';

@Entity('s_category_named_all', {
	orderBy: {
		id: 'ASC',
	},
})
export class Category {
	@PrimaryGeneratedColumn({
		name: 's_category_id',
	})
	id: number;

	@Column()
	name: string;

	@OneToOne(
		(type) => Post,
		(post) => post.oneCategory,
	)
	onePost: Promise<Post>;

	@ManyToMany(
		(type) => Post,
		(post) => post.twoSideCategories,
	)
	twoSidePosts: Promise<Post[]>;

	@OneToMany(
		(type) => Post,
		(post) => post.twoSideCategory,
	)
	twoSidePosts2: Promise<Post[]>;

	// ManyToMany with named properties
	@ManyToMany(
		(type) => Post,
		(post) => post.categoriesNamedAll,
	)
	postsNamedAll: Promise<Post[]>;

	// OneToMany with named properties
	@OneToMany(
		(type) => Post,
		(post) => post.categoryNamedAll,
	)
	onePostsNamedAll: Promise<Post[]>;

	// OneToOne with named properties
	@OneToOne(
		(type) => Post,
		(post) => post.oneCategoryNamedAll,
	)
	onePostNamedAll: Promise<Post>;
}
