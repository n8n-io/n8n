import { Column } from '../../../../../../../src/decorator/columns/Column';
import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { Teacher } from './Teacher';

@Entity()
export class Specialization {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Teacher,
		(teacher) => teacher.specializations,
	)
	teacher: Teacher;
}
