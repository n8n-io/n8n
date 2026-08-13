import { Column } from '../../../../src/decorator/columns/Column';

export class Contact {
	@Column()
	name: string;

	@Column()
	email: string;
}
