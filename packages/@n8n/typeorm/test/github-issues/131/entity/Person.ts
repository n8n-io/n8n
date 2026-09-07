import { Column } from '../../../../src/decorator/columns/Column';
import { TableInheritance } from '../../../../src/decorator/entity/TableInheritance';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';

@Entity()
@TableInheritance({ column: { name: 'type', type: String } })
export class Person {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;
}
