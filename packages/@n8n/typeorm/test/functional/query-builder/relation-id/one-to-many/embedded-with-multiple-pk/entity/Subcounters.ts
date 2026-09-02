import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { OneToMany } from '../../../../../../../src/decorator/relations/OneToMany';
import { User } from './User';

export class Subcounters {
	@PrimaryColumn()
	version: number;

	@Column()
	watches: number;

	@OneToMany(
		(type) => User,
		(user) => user.post,
	)
	watchedUsers: User[];

	watchedUserIds: number[];
}
