import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../../src';

@Entity()
export class Foo {
	@PrimaryColumn()
	id1: number;

	@PrimaryColumn()
	id2: number;
}
