import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Faculty {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
