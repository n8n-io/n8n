import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, Index } from '../../../../src';
import { Faculty } from './Faculty';
import { Teacher } from './Teacher';

@Entity()
@Index('student_name_index', ['name'])
export class Student {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne((type) => Faculty)
	faculty: Faculty;

	@ManyToOne((type) => Teacher)
	teacher: Teacher;
}
