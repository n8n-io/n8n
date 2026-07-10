import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';

export class Counters {
	@PrimaryColumn()
	code: number;

	@Column()
	likes: number;

	@Column()
	comments: number;

	@Column()
	favorites: number;
}
