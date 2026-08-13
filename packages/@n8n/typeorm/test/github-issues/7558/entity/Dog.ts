import { ChildEntity, Column } from '../../../../src';

import { AnimalEntity } from './Animal';

@ChildEntity('dog')
export class DogEntity extends AnimalEntity {
	// Dog stuff
	@Column()
	steaksEaten: number;
}
