import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from '../../../../src';
import { TestEntity2 } from './TestEntity2';
import { TestEntity4 } from './TestEntity4';

@Entity()
export class TestEntity3 {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToOne(
		(t) => TestEntity2,
		(a) => a.Entity3,
	)
	Entity2: TestEntity2;

	@Column()
	name: string;

	@OneToMany(
		(t) => TestEntity4,
		(entity4) => entity4.Entity3,
	)
	Entity4: TestEntity4[];
}
