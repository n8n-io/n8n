import { Column } from '../../../../src/decorator/columns/Column';
import { Entity } from '../../../../src/decorator/entity/Entity';
import { Index } from '../../../../src/decorator/Index';

@Entity()
export class Foo {
	@Column('date')
	@Index({ expireAfterSeconds: 0 })
	expireAt: Date;
}
