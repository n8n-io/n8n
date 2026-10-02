import { Entity, PrimaryGeneratedColumn, TableInheritance } from '../../../../src';

export abstract class Engine {}

@Entity()
@TableInheritance({ column: { name: 'type', type: String } })
export abstract class Vehicle {
	@PrimaryGeneratedColumn()
	public id?: number;

	public abstract engine: Engine;
}
