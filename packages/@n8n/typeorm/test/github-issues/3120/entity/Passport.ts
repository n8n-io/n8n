import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { Column } from '../../../../src/decorator/columns/Column';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { Person } from './Person';

@Entity()
export class Passport {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	passportNumber: string;

	@OneToOne(
		(type) => Person,
		(person) => person.passport,
	)
	owner: Person;
}
