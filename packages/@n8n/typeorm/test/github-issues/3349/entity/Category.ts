import { PrimaryColumn } from '../../../../src';
import { Column } from '../../../../src';
import { Entity } from '../../../../src';

@Entity()
export class Category {
	@PrimaryColumn()
	public id!: number;

	@Column()
	public myField!: number;
}
