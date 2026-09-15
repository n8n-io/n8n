import { Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;
}
