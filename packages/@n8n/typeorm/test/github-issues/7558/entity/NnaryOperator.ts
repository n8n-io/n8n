import { ChildEntity, Column, TreeChildren } from '../../../../src';

import { OperatorTreeEntry } from './OperatorTreeEntry';

@ChildEntity('nnary')
export class NnaryOperator extends OperatorTreeEntry {
	@TreeChildren({ cascade: true })
	children: OperatorTreeEntry[];

	@Column()
	operator: string;
}
