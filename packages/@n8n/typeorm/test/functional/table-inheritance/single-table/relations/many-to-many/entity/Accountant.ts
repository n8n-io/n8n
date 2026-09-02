import { ChildEntity } from '../../../../../../../src/decorator/entity/ChildEntity';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';
import { Employee } from './Employee';
import { Department } from './Department';

@ChildEntity()
export class Accountant extends Employee {
	@ManyToMany(
		(type) => Department,
		(department) => department.accountants,
	)
	@JoinTable()
	departments: Department[];
}
