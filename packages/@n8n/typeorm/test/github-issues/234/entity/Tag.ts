import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Post } from './Post';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Tag {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(
		(type) => Post,
		(post) => post.tags,
	)
	posts: Promise<Post[]>;
}
