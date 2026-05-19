import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Faculty } from './Faculty';
import { ManyToOne } from '../../../../src/decorator/relations/ManyToOne';
import { Teacher } from './Teacher';
import { Index } from '../../../../src/decorator/Index';

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
