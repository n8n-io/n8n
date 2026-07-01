import { Column } from '../../../../src/decorator/columns/Column';
import { TableInheritance } from '../../../../src/decorator/entity/TableInheritance';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';

export enum PersonType {
	Employee = 1,
	Homesitter = 2,
	Student = 3,
}

@Entity('issue184_person')
@TableInheritance({ column: { name: 'type', type: 'int' } })
export abstract class Person {
	@PrimaryColumn()
	id: string;

	@Column()
	firstName: string;

	@Column()
	lastName: string;

	type: PersonType;
}
