import { Entity, PrimaryGeneratedColumn, Column } from '../../../../src';

@Entity()
export class Profile {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	gender: string;

	@Column()
	photo: string;
}
