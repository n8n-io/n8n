import {
	Column,
	OneToMany,
	Entity,
	PrimaryGeneratedColumn,
	DeleteDateColumn,
} from '../../../../src';
import { Rule } from './Rule';

@Entity('fact')
export class Fact {
	@PrimaryGeneratedColumn({ type: 'int' })
	id?: number;

	@DeleteDateColumn()
	deletedAt?: Date;

	@OneToMany(
		() => Rule,
		(rule) => rule.fact,
	)
	rules?: Rule[];

	@Column('varchar')
	name!: string;
}
