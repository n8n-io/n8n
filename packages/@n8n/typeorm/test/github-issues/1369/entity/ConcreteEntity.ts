import { Column, Entity } from '../../../../src/index';
import { AbstractEntity } from './AbstractEntity';

@Entity()
export class ConcreteEntity extends AbstractEntity {
	@Column() position: string;
}
