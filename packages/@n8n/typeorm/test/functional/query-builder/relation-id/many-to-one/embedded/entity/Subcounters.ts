import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { User } from './User';

export class Subcounters {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	version: number;

	@Column()
	watches: number;

	@ManyToOne((type) => User)
	watchedUser: User;

	watchedUserId: number;
}
