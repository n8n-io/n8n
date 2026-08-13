import { Column } from '../../../../../../src/decorator/columns/Column';
import { ChildEntity } from '../../../../../../src/decorator/entity/ChildEntity';
import { Employee } from './Employee';

@ChildEntity()
export class Teacher extends Employee {
	@Column()
	specialization: string;
}
