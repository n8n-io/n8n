import { Column, PrimaryGeneratedColumn } from '../../../../../src';
import { Entity } from '../../../../../src';

export enum Operator {
	LT = 'lt',
	LE = 'le',
	EQ = 'eq',
	NE = 'ne',
	GE = 'ge',
	GT = 'gt',
}

@Entity()
export class Metric {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'enum', enum: Operator, default: Operator.EQ })
	defaultOperator!: string;

	@Column({ type: 'enum', enum: Operator })
	defaultOperator2!: string;

	@Column({ type: 'enum', enum: Operator, default: Operator.EQ })
	defaultOperator3!: string;

	@Column({ type: 'enum', enum: Operator, default: Operator.EQ })
	defaultOperator4!: string;
}
