import { Column } from '../../../../../../../src/decorator/columns/Column';
import { Entity } from '../../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToOne } from '../../../../../../../src/decorator/relations/ManyToOne';
import { Accountant } from './Accountant';

@Entity()
export class Department {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(type) => Accountant,
		(accountant) => accountant.departments,
	)
	accountant: Accountant;
}
