import { PrimaryColumn, Column } from '../../../../src';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@Column('decimal', { default: -0, precision: 3, scale: 1 })
	decimalWithDefault: number;

	@Column('decimal', { default: 100, precision: 3 })
	noScale: number;

	@Column('decimal', { default: 10, precision: 3, scale: 0 })
	zeroScale: number;

	@Column('decimal', { default: 9999999999 })
	maxDefault: number;

	@Column('decimal', { default: -9999999999 })
	minDefault: number;

	@Column('int', { default: -100 })
	intDefault: number;

	@Column('float', { default: 3.5 })
	floatDefault: number;

	@Column({ default: 'New user' })
	stringDefault: string;

	// ER_PARSE_ERROR
	// @Column("decimal", { default: 0, precision: 8, scale: -4 })
	// negativeScale: number;

	// ER_INVALID_DEFAULT
	// @Column("decimal", { default: -12345.67890, precision: 8, scale: 4 })
	// defaultOverflow: number;
}
