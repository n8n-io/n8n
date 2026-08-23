import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn('increment')
	id!: number;

	@Column()
	content!: string;
}
