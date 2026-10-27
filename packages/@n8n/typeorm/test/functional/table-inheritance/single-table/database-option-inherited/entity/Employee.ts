import { ChildEntity, Column } from '../../../../../../src';

import { Person } from './Person';

@ChildEntity()
export class Employee extends Person {
	@Column()
	salary: number;
}
