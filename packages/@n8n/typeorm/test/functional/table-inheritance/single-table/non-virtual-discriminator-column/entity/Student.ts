import { Column } from '../../../../../../src/decorator/columns/Column';
import { ChildEntity } from '../../../../../../src/decorator/entity/ChildEntity';
import { Person } from './Person';

@ChildEntity('student-type')
export class Student extends Person {
	@Column()
	faculty: string;
}
