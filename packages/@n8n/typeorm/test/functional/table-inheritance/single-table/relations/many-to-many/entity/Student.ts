import { ChildEntity } from '../../../../../../../src/decorator/entity/ChildEntity';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { Person } from './Person';
import { Faculty } from './Faculty';
import { JoinTable } from '../../../../../../../src/decorator/relations/JoinTable';

@ChildEntity()
export class Student extends Person {
	@ManyToMany(
		(type) => Faculty,
		(faculty) => faculty.students,
	)
	@JoinTable()
	faculties: Faculty[];
}
