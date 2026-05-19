import { Entity, PrimaryGeneratedColumn } from '../../../../src/index';

@Entity()
export class Category {
	@PrimaryGeneratedColumn()
	id: number;
}
