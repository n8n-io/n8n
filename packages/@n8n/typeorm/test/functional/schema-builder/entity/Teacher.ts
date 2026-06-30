import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Student } from './Student';
import { OneToMany } from '../../../../src/decorator/relations/OneToMany';
import { Index } from '../../../../src/decorator/Index';

@Entity()
@Index('ignored_index', { synchronize: false })
export class Teacher {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		(type) => Student,
		(student) => student.teacher,
	)
	students: Student[];
}
