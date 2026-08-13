import { Column } from '../../../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../../../src/decorator/columns/PrimaryColumn';
import { User } from './User';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';

export class Subcounters {
	@PrimaryColumn()
	version: number;

	@Column()
	watches: number;

	@ManyToOne((type) => User)
	watchedUser: User;

	watchedUserId: number;
}
