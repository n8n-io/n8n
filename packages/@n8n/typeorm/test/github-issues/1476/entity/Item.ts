import { Entity, PrimaryColumn, Column } from '../../../../src/index';

@Entity()
export class Item {
	@PrimaryColumn()
	itemId: number;

	@Column()
	planId: number;
}
