import { Column } from '../../../../../../../src/decorator/columns/Column';
import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { Student } from './Student';

@Entity()
export class Faculty {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Student,
		(student) => student.faculties,
	)
	student: Student;
}
