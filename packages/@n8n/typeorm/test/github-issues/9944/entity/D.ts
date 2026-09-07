import { Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';
import { C } from './C';

@Entity()
export class D {
	@PrimaryGeneratedColumn('increment')
	id!: number;

	@ManyToOne(
		() => C,
		(c) => c.ds,
		{
			onDelete: 'CASCADE',
			onUpdate: 'CASCADE',
		},
	)
	c!: C;
}
