import { PrimaryGeneratedColumn, Entity, Column } from '../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number | null;

	@Column()
	title: string;
}
