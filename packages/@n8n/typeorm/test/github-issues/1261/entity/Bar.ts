import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { BaseEntity } from '../../../../src/repository/BaseEntity';
import { OneToOne } from '../../../../src/decorator/relations/OneToOne';
import { Foo } from './Foo';
import { JoinColumn } from '../../../../src/decorator/relations/JoinColumn';

@Entity()
export class Bar extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToOne((type) => Foo, {
		onDelete: 'SET NULL',
	})
	@JoinColumn()
	foo: Foo;
}
