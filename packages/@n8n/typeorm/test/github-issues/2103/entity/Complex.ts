import { Entity, Column, PrimaryColumn } from '../../../../src';

@Entity()
export class Complex {
	@PrimaryColumn()
	id: number;

	@PrimaryColumn()
	code: number;

	@Column()
	x: number;
}
