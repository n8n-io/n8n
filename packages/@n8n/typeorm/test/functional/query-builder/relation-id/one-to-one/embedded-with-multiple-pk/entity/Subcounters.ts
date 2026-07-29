import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { OneToOne } from '../../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../../src/decorator/relations/JoinColumn';
import { User } from './User';

export class Subcounters {
	@PrimaryColumn()
	version: number;

	@Column()
	watches: number;

	@OneToOne((type) => User)
	@JoinColumn()
	watchedUser: User;

	watchedUserId: number;
}
