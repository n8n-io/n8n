import { Column } from '../../../../src/decorator/columns/Column';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../src/decorator/relations/JoinTable';
import { User } from './User';

export class Subcounters {
	@Column()
	version: number;

	@Column()
	watches: number;

	@ManyToMany((type) => User)
	@JoinTable({ name: 'post_cnt_subcnt_wtch_users' })
	watchedUsers: User[];
}
