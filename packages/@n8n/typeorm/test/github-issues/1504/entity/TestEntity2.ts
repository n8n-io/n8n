import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from '../../../../src';
import { TestEntity1 } from './TestEntity1';
import { TestEntity3 } from './TestEntity3';

@Entity()
export class TestEntity2 {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToOne(
		(t) => TestEntity1,
		(a) => a.Entity2,
	)
	Entity1: TestEntity1;

	@OneToOne(
		(t) => TestEntity3,
		(a) => a.Entity2,
	)
	@JoinColumn()
	Entity3: TestEntity3;
}
