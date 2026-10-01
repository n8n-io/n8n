import { ChildEntity, Column } from '../../../../src';

import { Base } from './Base';

@ChildEntity()
export class A extends Base {
	@Column()
	a!: boolean;

	constructor(a: boolean) {
		super();

		this.a = a;
	}
}
