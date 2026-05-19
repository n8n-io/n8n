import { Column, Entity, PrimaryGeneratedColumn } from '../../../../../src/index';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;
}
