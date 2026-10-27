import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';

export class Subcounters {
	@PrimaryColumn()
	version: number;

	@Column()
	watches: number;
}
