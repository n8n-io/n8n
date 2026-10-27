import { Column, Entity, PrimaryGeneratedColumn } from '../../../../../src';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
