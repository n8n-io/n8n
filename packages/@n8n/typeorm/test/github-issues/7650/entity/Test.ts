import { Column, Entity, PrimaryColumn } from '../../../../src';

@Entity()
export class Test {
	@PrimaryColumn()
	id: number;

	@Column({
		type: 'jsonb',
		default: { z: 1, a: 2 },
	})
	myjsoncolumn: string;
}
