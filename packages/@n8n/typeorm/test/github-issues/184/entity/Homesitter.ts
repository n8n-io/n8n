import { Column } from '../../../../src/decorator/columns/Column';
import { Person, PersonType } from './Person';
import { ChildEntity } from '../../../../src/decorator/entity/ChildEntity';

@ChildEntity(PersonType.Homesitter) // required
export class Homesitter extends Person {
	@Column()
	numberOfKids: number;

	@Column()
	shared: string;

	constructor() {
		super();
		this.type = 2;
	}
}
