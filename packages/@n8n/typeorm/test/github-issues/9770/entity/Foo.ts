import { Entity, Column, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Foo {
	@PrimaryGeneratedColumn() id: number;

	@Column()
	data: string;
}
