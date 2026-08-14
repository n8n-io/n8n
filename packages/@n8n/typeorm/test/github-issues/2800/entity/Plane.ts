import { Engine, Vehicle } from './Vehicle';
import { ChildEntity, Column } from '../../../../src';

export class PlaneEngine extends Engine {
	@Column()
	public beep: number;

	@Column()
	public boop: number;
}

@ChildEntity()
export class Plane extends Vehicle {
	@Column((type) => PlaneEngine, { prefix: 'planeEngine' })
	public engine: PlaneEngine;
}
