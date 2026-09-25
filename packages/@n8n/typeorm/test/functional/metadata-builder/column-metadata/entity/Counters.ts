import { Column } from '../../../../../src/decorator/columns/Column';
import { Subcounters } from './Subcounters';

export class Counters {
	@Column()
	code: number;

	@Column()
	likes: number;

	@Column()
	comments: number;

	@Column()
	favorites: number;

	@Column(() => Subcounters, { prefix: 'sub' })
	subcounters: Subcounters;
}
