import { Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class TestEntity {
	@PrimaryGeneratedColumn()
	id: number;
}
