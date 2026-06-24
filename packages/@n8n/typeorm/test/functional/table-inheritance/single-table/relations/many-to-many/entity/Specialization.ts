import { Column } from '../../../../../../../src/decorator/columns/Column';
import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { Teacher } from './Teacher';

@Entity()
export class Specialization {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(
		(type) => Teacher,
		(teacher) => teacher.specializations,
	)
	teachers: Teacher[];
}
