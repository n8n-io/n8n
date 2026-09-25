import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Author {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
