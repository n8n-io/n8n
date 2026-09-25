import { Column } from '../../../../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../../../../src/decorator/relations/OneToOne';
import { JoinColumn } from '../../../../../../../src/decorator/relations/JoinColumn';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { User } from './User';

export class Subcounters {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	version: number;

	@Column()
	watches: number;

	@OneToOne((type) => User)
	@JoinColumn()
	watchedUser: User;

	watchedUserId: number;
}
