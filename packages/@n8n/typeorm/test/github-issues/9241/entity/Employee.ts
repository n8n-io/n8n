import { Column, ChildEntity } from '../../../../src';

import { User } from './User';

@ChildEntity()
export class Employee extends User {
	@Column()
	salary: number;
}
