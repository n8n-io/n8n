import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';

export class Unit {
	@PrimaryGeneratedColumn()
	id: number;
}
