import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { Post } from './Post';

@Entity({ schema: 'guest' })
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne((type) => Post)
	post: Post;
}
