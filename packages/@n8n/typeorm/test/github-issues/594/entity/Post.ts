import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src/index';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	postId: number;

	@Column()
	modelId: number;
}
