import { Entity, PrimaryGeneratedColumn, Column } from '../../../../src';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
