import { Person } from './Person';
import { ChildEntity, Column } from '../../../../src';

@ChildEntity()
export class Men extends Person {
	@Column('varchar')
	beardColor: string;
}
