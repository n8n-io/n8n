import { Column, Entity, PrimaryColumn } from '../../../../../src';

@Entity()
export class ExternalPost {
	@PrimaryColumn()
	outlet: string;

	@PrimaryColumn()
	id: number;

	@Column()
	title: string;
}
