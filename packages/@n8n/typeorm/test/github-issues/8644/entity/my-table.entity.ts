import { Column, PrimaryGeneratedColumn } from '../../../../src';
import { Entity } from '../../../../src/decorator/entity/Entity';

export enum Limit {
	Foo = 'foo',
	Bar = 'bar',
}

@Entity()
export class MyTable {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'simple-enum', enum: Limit })
	limit: Limit;
}
