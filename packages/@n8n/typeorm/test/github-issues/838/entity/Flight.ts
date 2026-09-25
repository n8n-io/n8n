import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../../src/decorator/columns/Column';

@Entity()
export class Flight {
	constructor(id: number, date: Date) {
		this.id = id;
		this.date = date;
	}

	@PrimaryGeneratedColumn()
	id: number;

	@Column('timestamp with time zone')
	date: Date;
}
