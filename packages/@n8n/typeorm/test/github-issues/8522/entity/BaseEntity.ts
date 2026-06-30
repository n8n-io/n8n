import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from '../../../../src';

export class BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
