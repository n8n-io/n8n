import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';
import { Post } from './Post';
import { OneToMany } from '../../../../../../src/decorator/relations/OneToMany';
import { BaseEntity } from '../../../../../../src';

@Entity()
export class Category extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		() => Post,
		(post) => post.category,
	)
	posts: Promise<Post[]>;
}
