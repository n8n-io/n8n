import { Column } from '../../../../src/decorator/columns/Column';

export class Information {
	@Column()
	maritalStatus: string;

	@Column()
	gender: string;

	@Column()
	address: string;
}
