import { Entity, Column, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	name: string;
}
