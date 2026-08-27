import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Book {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;
}
