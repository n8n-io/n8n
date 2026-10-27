import { Entity, PrimaryGeneratedColumn } from '../../../../../../src';

@Entity()
export class Breed {
	@PrimaryGeneratedColumn()
	id: number;
}
