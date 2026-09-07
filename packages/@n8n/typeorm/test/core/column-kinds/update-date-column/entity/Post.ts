import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from '../../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@UpdateDateColumn()
	updatedAt: Date;
}
