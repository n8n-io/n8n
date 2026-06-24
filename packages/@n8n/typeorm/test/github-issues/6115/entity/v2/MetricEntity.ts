import { Column, PrimaryGeneratedColumn } from '../../../../../src';
import { Entity } from '../../../../../src';

export enum Operator {
	LT = 'lessthan',
	LE = 'lessequal',
	EQ = 'equal',
	NE = 'notequal',
	GE = 'greaterequal',
	GT = 'greaterthan',
}

@Entity()
export class Metric {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'enum', enum: Operator, default: Operator.EQ })
	defaultOperator!: string;

	@Column({ type: 'enum', enum: Operator, default: Operator.EQ })
	defaultOperator2!: string;

	@Column({ type: 'enum', enum: Operator })
	defaultOperator3!: string;

	@Column({ type: 'enum', enum: Operator, default: Operator.GT })
	defaultOperator4!: string;
}
