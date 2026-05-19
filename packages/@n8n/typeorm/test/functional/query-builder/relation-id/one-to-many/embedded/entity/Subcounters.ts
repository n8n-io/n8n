import { Column } from '../../../../../../../src/decorator/columns/Column';
import { OneToMany } from '../../../../../../../src/decorator/relations/OneToMany';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { User } from './User';

export class Subcounters {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	version: number;

	@Column()
	watches: number;

	@OneToMany(
		(type) => User,
		(user) => user.posts,
	)
	watchedUsers: User[];

	watchedUserIds: number[];
}
