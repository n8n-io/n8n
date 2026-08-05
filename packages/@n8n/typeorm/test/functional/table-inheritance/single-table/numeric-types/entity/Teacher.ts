import { Column } from '../../../../../../src/decorator/columns/Column';
import { ChildEntity } from '../../../../../../src/decorator/entity/ChildEntity';
import { Person } from './Person';

@ChildEntity(1)
export class Teacher extends Person {
	@Column()
	specialization: string;
}
