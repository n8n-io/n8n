import { Column, Entity, PrimaryGeneratedColumn } from '../../../src';

@Entity()
export class Comment {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	text: string;
}
