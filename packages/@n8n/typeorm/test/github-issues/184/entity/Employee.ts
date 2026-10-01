import { Column } from '../../../../src/decorator/columns/Column';
import { Person, PersonType } from './Person';
import { ChildEntity } from '../../../../src/decorator/entity/ChildEntity';

@ChildEntity(PersonType.Employee)
export class Employee extends Person {
	@Column()
	salary: number;

	@Column()
	shared: string;

	constructor() {
		super();
		this.type = 1;
	}
}
