import { ChildEntity, Column } from '../../../../src';

import { OperatorTreeEntry } from './OperatorTreeEntry';

@ChildEntity('number')
export class NumberEntry extends OperatorTreeEntry {
	@Column({
		type: 'float',
	})
	value: number;
}
