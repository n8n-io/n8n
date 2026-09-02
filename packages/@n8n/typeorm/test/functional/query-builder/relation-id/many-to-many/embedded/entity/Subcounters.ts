import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { User } from './User';

export class Subcounters {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	version: number;

	@Column()
	watches: number;

	@ManyToMany((type) => User)
	@JoinTable({ name: 'subcnt_users' })
	watchedUsers: User[];

	watchedUserIds: number[];
}
