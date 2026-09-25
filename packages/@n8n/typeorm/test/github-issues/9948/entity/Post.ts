import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column({ default: 0 })
	updatedNameColumnsCount: number;
}
