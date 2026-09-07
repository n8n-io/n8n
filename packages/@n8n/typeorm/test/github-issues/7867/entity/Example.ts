import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Example {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
