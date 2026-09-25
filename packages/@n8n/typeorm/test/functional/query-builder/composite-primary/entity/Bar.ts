import { Entity } from '../../../../../src/decorator/entity/Entity';
import { ManyToOne, PrimaryColumn } from '../../../../../src';
import { Foo } from './Foo';

@Entity()
export class Bar {
	@PrimaryColumn()
	id: number;

	@ManyToOne((type) => Foo)
	foo: Foo;
}
