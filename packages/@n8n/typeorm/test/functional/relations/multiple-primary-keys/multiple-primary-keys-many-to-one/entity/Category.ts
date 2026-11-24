import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';
import { Post } from './Post';
import { Unique } from '../../../../../../src';

@Entity()
@Unique(['code', 'version', 'description'])
export class Category {
	@PrimaryColumn()
	name: string;

	@PrimaryColumn()
	type: string;

	@Column()
	code: number;

	@Column()
	version: number;

	@Column({ nullable: true })
	description: string;

	@OneToMany(
		(type) => Post,
		(post) => post.category,
	)
	posts: Post[];

	@OneToMany(
		(type) => Post,
		(post) => post.categoryWithJoinColumn,
	)
	postsWithJoinColumn: Post[];

	@OneToMany(
		(type) => Post,
		(post) => post.categoryWithOptions,
	)
	postsWithOptions: Post[];

	@OneToMany(
		(type) => Post,
		(post) => post.categoryWithNonPKColumns,
	)
	postsWithNonPKColumns: Post[];
}
