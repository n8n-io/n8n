import * as TypeOrm from '../../../../../../src';
import { Person } from './Person';

@TypeOrm.Entity({ name: 'person' })
export class Employee extends Person {
	@TypeOrm.Column({ default: null })
	public employeeName: string;
}
