import { Column } from '../../../../../src/decorator/columns/Column';

export class Information {
	@Column({ name: 'descr' })
	description: string;
}
