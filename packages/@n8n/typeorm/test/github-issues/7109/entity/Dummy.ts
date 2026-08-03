import { Entity, PrimaryGeneratedColumn } from '../../../../src';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Dummy {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	field: string;
}
