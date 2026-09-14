import { Column, Entity, PrimaryColumn } from '../../../../src';

@Entity()
export class Weather {
	@PrimaryColumn()
	id: string;

	@Column({ type: 'float' })
	temperature: number;
}
