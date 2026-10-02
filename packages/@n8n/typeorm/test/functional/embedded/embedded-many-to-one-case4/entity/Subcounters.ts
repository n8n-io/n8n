import { Column } from '../../../../../src/decorator/columns/Column';

export class Subcounters {
	@Column()
	version: number;

	@Column()
	watches: number;
}
