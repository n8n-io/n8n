import { Column } from '../../../../../src/decorator/columns/Column';
import { DeleteDateColumn } from '../../../../../src/decorator/columns/DeleteDateColumn';
export class Counters {
	@Column({ default: 1 })
	likes: number;

	@Column({ nullable: true })
	favorites: number;

	@Column({ default: 0 })
	comments: number;

	@DeleteDateColumn()
	deletedAt: Date;
}
