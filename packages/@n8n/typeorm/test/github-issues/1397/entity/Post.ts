import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src/index';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;
}
