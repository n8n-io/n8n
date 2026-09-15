import { Column, Entity, PrimaryGeneratedColumn } from '../../../src/index';

@Entity('sample3_post_category')
export class PostCategory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
