import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';

export class BaseContent {
	@PrimaryGeneratedColumn()
	id: number;
}
