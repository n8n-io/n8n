import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

import { B } from './B';

@Entity()
export class A {
	@PrimaryGeneratedColumn('increment')
	id!: number;

	@Column(() => B)
	b!: B;
}
