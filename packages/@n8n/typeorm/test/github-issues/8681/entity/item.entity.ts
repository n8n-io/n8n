import { Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../src';
import { Thing } from './thing.entity';

@Entity()
export class Item {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(
		() => Thing,
		(thing) => thing.items,
	)
	thing!: Thing;
}
