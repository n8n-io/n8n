import { Column } from '../../../../../src/decorator/columns/Column';
import { Unit } from './Unit';

export class Content extends Unit {
	@Column()
	name: string;
}
