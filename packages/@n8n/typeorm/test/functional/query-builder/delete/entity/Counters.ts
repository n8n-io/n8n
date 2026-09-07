import { Column } from '../../../../../src/decorator/columns/Column';

export class Counters {
	@Column({ default: 1 })
	likes: number;

	@Column({ nullable: true })
	favorites: number;

	@Column({ default: 0 })
	comments: number;
}
