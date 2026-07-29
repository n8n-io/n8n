import { ChildEntity, Column } from '../../../../src';

import { Base } from './Base';

@ChildEntity()
export class C extends Base {
	@Column()
	c!: string;

	constructor(c: string) {
		super();

		this.c = c;
	}
}
