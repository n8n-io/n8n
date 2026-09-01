import { Column } from '../../../../../../../src/decorator/columns/Column';
import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToMany } from '../../../../../../../src/decorator/relations/ManyToMany';
import { Accountant } from './Accountant';

@Entity()
export class Department {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToMany(
		(type) => Accountant,
		(accountant) => accountant.departments,
	)
	accountants: Accountant[];
}
