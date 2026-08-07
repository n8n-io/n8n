import { Column, CreateDateColumn } from '../../../../src';

export class Comment {
	@CreateDateColumn()
	createdAt: Date;

	@Column()
	savedBy: string;
}
