import { ChildEntity } from '../../../../../../../src/decorator/entity/ChildEntity';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';
import { Employee } from './Employee';
import { Specialization } from './Specialization';

@ChildEntity()
export class Teacher extends Employee {
	@ManyToMany(
		(type) => Specialization,
		(specialization) => specialization.teachers,
	)
	@JoinTable({ name: 'person_specs' })
	specializations: Specialization[];
}
