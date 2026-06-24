import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/index';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../src/decorator/relations/ManyToOne';
import { Post } from './Post';
import { Counters } from './Counters';
import { User } from './User';

@Entity()
export class Photo {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	filename: string;

	@ManyToOne((type) => User)
	user: User;

	@ManyToOne(
		(type) => Post,
		(post) => post.photos,
	)
	post: Post;

	@Column((type) => Counters)
	counters: Counters;
}
