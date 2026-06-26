import { Entity, JoinColumn, OneToOne, PrimaryColumn } from '../../../../src';
import { Party } from './Party';

@Entity()
export class Person {
	// Party ID also acts as PK for Person (ie. inheritance)
	@PrimaryColumn('uuid')
	id: string;

	@OneToOne(() => Party, { cascade: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'id' })
	party: Party;
}
