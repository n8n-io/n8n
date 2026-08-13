import { Entity, PrimaryGeneratedColumn, Column } from '../../../../src';

@Entity('categories')
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
