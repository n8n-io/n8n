import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';
import { TestEntity3 } from './TestEntity3';

@Entity()
export class TestEntity4 {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@ManyToOne(
		(t) => TestEntity3,
		(entity3) => entity3.Entity4,
	)
	Entity3: TestEntity3;
}
