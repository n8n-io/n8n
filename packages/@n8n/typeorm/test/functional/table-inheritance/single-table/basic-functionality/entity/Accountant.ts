import { Column } from '../../../../../../src/decorator/columns/Column';
import { ChildEntity } from '../../../../../../src/decorator/entity/ChildEntity';
import { Employee } from './Employee';

@ChildEntity()
export class Accountant extends Employee {
	@Column()
	department: string;
}
