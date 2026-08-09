import { Column } from '../../../../src';

export class Contact {
	@Column({ unique: true })
	email: string;
}
