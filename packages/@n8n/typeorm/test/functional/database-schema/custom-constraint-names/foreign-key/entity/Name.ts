import { Entity, PrimaryGeneratedColumn } from '../../../../../../src';

@Entity()
export class Name {
	@PrimaryGeneratedColumn()
	id: number;
}
