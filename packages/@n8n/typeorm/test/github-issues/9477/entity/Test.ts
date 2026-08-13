import { Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Test {
	@PrimaryGeneratedColumn({ unsigned: true })
	id: number;
}
