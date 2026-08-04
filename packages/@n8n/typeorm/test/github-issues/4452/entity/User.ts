import { Entity, PrimaryGeneratedColumn, Column } from '../../../../src';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	created_at: Date;
}
