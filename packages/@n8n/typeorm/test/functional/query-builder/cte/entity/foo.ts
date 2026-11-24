import { PrimaryColumn } from '../../../../../src';
import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';

@Entity()
export class Foo {
	@PrimaryColumn()
	id: number;

	@Column()
	bar: string;
}
