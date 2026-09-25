import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from '../../../../../src';
import { ViewC } from './ViewC';
import { ViewB } from './ViewB';
import { ViewA } from './ViewA';

@Entity()
export class TestEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('varchar')
	type: string;

	// Bogus relations to mix up import order
	@OneToOne(() => ViewC)
	@JoinColumn()
	somehowMatched: ViewC;

	// Bogus relations to mix up import order
	@OneToOne(() => ViewB)
	@JoinColumn()
	somehowMatched2: ViewB;

	// Bogus relations to mix up import order
	@OneToOne(() => ViewA)
	@JoinColumn()
	somehowMatched3: ViewA;
}
