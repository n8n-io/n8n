import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { JoinColumn } from '../../../../../src/decorator/relations/JoinColumn';
import { Post } from './Post';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne((type) => Post)
	@JoinColumn()
	likedPost: Post;
}
