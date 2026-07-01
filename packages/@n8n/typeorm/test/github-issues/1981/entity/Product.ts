import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Product {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	liked: boolean;
}
