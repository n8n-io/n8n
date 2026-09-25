import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Profile {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	image: string;
}
