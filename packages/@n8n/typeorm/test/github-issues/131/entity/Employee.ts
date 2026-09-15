import { Column } from '../../../../src/decorator/columns/Column';
import { Person } from './Person';
import { ChildEntity } from '../../../../src/decorator/entity/ChildEntity';

@ChildEntity()
export class Employee extends Person {
	@Column()
	salary: number;
}
