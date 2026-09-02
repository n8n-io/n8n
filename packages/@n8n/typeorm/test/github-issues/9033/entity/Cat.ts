import { ChildEntity, Column } from '../../../../src';

import { AnimalEntity } from './Animal';

@ChildEntity('cat')
export class CatEntity extends AnimalEntity {
	// Cat stuff
	@Column()
	livesLeft: number;
}
