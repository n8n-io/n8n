import { Entity, PrimaryGeneratedColumn, Column } from '../../../../src';

@Entity('profiles')
export class Profile {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	gender: string;

	@Column()
	photo: string;
}
