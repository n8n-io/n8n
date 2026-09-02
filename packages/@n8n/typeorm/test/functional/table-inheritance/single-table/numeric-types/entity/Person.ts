import { Column } from '../../../../../../src/decorator/columns/Column';
import { TableInheritance } from '../../../../../../src/decorator/entity/TableInheritance';
import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../../src/decorator/columns/PrimaryGeneratedColumn';

@Entity()
@TableInheritance({ column: { name: 'type', type: Number } })
export class Person {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	type: number;
}
