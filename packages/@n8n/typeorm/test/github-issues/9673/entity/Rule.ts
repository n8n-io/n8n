import {
	JoinColumn,
	Column,
	ManyToOne,
	Entity,
	PrimaryGeneratedColumn,
	DeleteDateColumn,
} from '../../../../src';
import { Node } from './Node';
import { Fact } from './Fact';

@Entity('rule')
export class Rule {
	@PrimaryGeneratedColumn({ type: 'int' })
	id?: number;

	@DeleteDateColumn()
	deletedAt?: Date;

	@Column('varchar')
	name!: string;

	@ManyToOne(
		() => Fact,
		(fact) => fact.rules,
		{ eager: true },
	)
	@JoinColumn([{ name: 'factId', referencedColumnName: 'id' }])
	fact?: Fact;

	@Column()
	factId?: number;

	@ManyToOne(
		() => Node,
		(node) => node.rules,
	)
	node?: Node;
}
