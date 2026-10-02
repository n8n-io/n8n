import { Person } from './Person';
import { ChildEntity, Column } from '../../../../src';

@ChildEntity()
export class Women extends Person {
	@Column('int')
	brassiereSize: number;
}
