import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity('test_entity')
export class TestEntity {
	@PrimaryColumn()
	id1: string;

	@PrimaryColumn()
	id2: string;

	@Column()
	name: string;
}
