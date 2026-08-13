import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { User } from './User';

export class Subcounters {
	@PrimaryColumn()
	version: number;

	@Column()
	watches: number;

	@ManyToMany(
		(type) => User,
		(user) => user.posts,
	)
	@JoinTable({ name: 'subcnt_users' })
	watchedUsers: User[];

	watchedUserIds: number[];
}
