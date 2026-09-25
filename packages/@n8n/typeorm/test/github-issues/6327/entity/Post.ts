import {
	DeleteDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@UpdateDateColumn()
	updatedAt: Date;

	@DeleteDateColumn()
	deletedAt: Date;
}
