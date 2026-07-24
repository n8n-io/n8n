import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Counters } from './Counters';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	text: string;

	@Column((type) => Counters)
	counters: Counters;

	@Column((type) => Counters, { prefix: 'testCounters' })
	otherCounters: Counters;

	@Column((type) => Counters, { prefix: '' })
	countersWithoutPrefix: Counters;
}
