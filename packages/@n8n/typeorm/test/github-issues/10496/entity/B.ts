import { ChildEntity, Column, Index } from '../../../../src';

import { Base } from './Base';

@ChildEntity()
export class B extends Base {
	@Column()
	@Index('IX_Base_b')
	b!: number;

	constructor(b: number) {
		super();

		this.b = b;
	}
}
