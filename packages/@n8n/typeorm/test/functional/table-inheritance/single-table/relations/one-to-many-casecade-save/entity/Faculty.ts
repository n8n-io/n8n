import { Column } from '../../../../../../../src/decorator/columns/Column';
import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Staff } from './Staff';
import { OneToMany } from '../../../../../../../src';

@Entity()
export class Faculty {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		(type) => Staff,
		(staff) => staff.faculty,
		{
			cascade: true,
			eager: true,
		},
	)
	staff: Staff[];
}
