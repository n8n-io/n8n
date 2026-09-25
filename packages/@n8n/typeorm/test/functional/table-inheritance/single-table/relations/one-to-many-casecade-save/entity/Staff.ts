import {
	Column,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
	TableInheritance,
} from '../../../../../../../src';
import { Faculty } from './Faculty';

@Entity()
@TableInheritance({ column: { name: 'type', type: String } })
export class Staff {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(
		(type) => Faculty,
		(faculty) => faculty.staff,
	)
	faculty: Faculty;

	@Column()
	type: string;
}
