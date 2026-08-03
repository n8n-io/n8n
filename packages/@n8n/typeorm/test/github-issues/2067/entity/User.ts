import { Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;
}
