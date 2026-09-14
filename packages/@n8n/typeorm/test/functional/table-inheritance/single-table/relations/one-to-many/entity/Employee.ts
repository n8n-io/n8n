import { Column } from '../../../../../../../src/decorator/columns/Column';
import { ChildEntity } from '../../../../../../../src/decorator/entity/ChildEntity';
import { Person } from './Person';

@ChildEntity()
export class Employee extends Person {
	@Column()
	salary: number;
}
