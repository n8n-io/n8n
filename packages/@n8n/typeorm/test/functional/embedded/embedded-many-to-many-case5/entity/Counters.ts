import { Column } from '../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../src/decorator/relations/JoinTable';
import { Subcounters } from './Subcounters';
import { User } from './User';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';

export class Counters {
	@PrimaryColumn()
	code: number;

	@Column()
	likes: number;

	@Column()
	comments: number;

	@Column()
	favorites: number;

	@Column(() => Subcounters, { prefix: 'subcnt' })
	subcounters: Subcounters;

	@ManyToMany(
		(type) => User,
		(user) => user.likedPosts,
	)
	@JoinTable()
	likedUsers: User[];
}
