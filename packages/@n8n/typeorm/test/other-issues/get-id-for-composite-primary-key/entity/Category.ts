import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Category {
	@PrimaryGeneratedColumn('increment')
	id!: number;

	@Column()
	name!: string;
}
