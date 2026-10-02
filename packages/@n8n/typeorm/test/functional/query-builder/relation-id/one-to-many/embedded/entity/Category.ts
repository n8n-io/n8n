import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Post } from './Post';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Post,
		(post) => post.counters.categories,
	)
	@JoinColumn()
	posts: Post[];

	postIds: number[];
}
