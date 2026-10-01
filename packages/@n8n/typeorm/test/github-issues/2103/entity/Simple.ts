import { Entity, Column, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Simple {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	x: number;
}
