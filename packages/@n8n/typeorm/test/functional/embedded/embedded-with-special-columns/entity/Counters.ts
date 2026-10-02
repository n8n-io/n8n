import { Column } from '../../../../../src/decorator/columns/Column';
import { CreateDateColumn } from '../../../../../src/decorator/columns/CreateDateColumn';
import { UpdateDateColumn } from '../../../../../src/decorator/columns/UpdateDateColumn';
import { DeleteDateColumn } from '../../../../../src/decorator/columns/DeleteDateColumn';
import { Subcounters } from './Subcounters';

export class Counters {
	@Column()
	likes: number;

	@Column()
	comments: number;

	@Column()
	favorites: number;

	@Column(() => Subcounters, { prefix: 'subcnt' })
	subcounters: Subcounters;

	@CreateDateColumn()
	createdDate: Date;

	@UpdateDateColumn()
	updatedDate: Date;

	@DeleteDateColumn()
	deletedDate: Date;
}
