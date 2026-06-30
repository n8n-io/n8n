import { Engine, Vehicle } from './Vehicle';
import { ChildEntity, Column } from '../../../../src';

export class CarEngine extends Engine {
	@Column()
	public horsePower: number;

	@Column()
	public torque: number;
}

@ChildEntity()
export class Car extends Vehicle {
	@Column((type) => CarEngine, { prefix: 'carEngine' })
	public engine: CarEngine;
}
