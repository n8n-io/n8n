import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../../src/decorator/columns/Column';

export class Unit {
	@PrimaryGeneratedColumn()
	id: string;

	@Column()
	type: string;
}
