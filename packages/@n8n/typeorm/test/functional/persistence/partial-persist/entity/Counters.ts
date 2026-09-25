import { Column } from '../../../../../src/decorator/columns/Column';

export class Counters {
	@Column()
	stars: number;

	@Column()
	commentCount: number;

	@Column()
	metadata: string;
}
