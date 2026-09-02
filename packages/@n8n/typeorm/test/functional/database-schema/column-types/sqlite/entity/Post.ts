import { Column, Entity, PrimaryColumn } from '../../../../../../src';
import { FruitEnum } from '../enum/FruitEnum';

@Entity()
export class Post {
	@PrimaryColumn()
	id: number;

	@Column()
	name: string;

	// -------------------------------------------------------------------------
	// Integer Types
	// -------------------------------------------------------------------------

	@Column('integer')
	integer: number;

	@Column('int')
	int: number;

	@Column('int2')
	int2: number;

	@Column('int8')
	int8: number;

	@Column('tinyint')
	tinyint: number;

	@Column('smallint')
	smallint: number;

	@Column('mediumint')
	mediumint: number;

	@Column('bigint')
	bigint: number;

	@Column('unsigned big int')
	unsignedBigInt: number;

	// -------------------------------------------------------------------------
	// Character Types
	// -------------------------------------------------------------------------

	@Column('character')
	character: string;

	@Column('varchar')
	varchar: string;

	@Column('varying character')
	varyingCharacter: string;

	@Column('nchar')
	nchar: string;

	@Column('native character')
	nativeCharacter: string;

	@Column('nvarchar')
	nvarchar: string;

	@Column('text')
	text: string;

	@Column('blob')
	blob: Buffer;

	@Column('clob')
	clob: string;

	// -------------------------------------------------------------------------
	// Real Types
	// -------------------------------------------------------------------------

	@Column('real')
	real: number;

	@Column('double')
	double: number;

	@Column('double precision')
	doublePrecision: number;

	@Column('float')
	float: number;

	// -------------------------------------------------------------------------
	// Numeric Types
	// -------------------------------------------------------------------------

	@Column('numeric')
	numeric: number;

	@Column('decimal')
	decimal: number;

	@Column('boolean')
	boolean: boolean;

	@Column('date')
	date: string;

	@Column('datetime')
	datetime: Date;

	// -------------------------------------------------------------------------
	// Other Types
	// -------------------------------------------------------------------------

	@Column('json')
	json: Object;

	// -------------------------------------------------------------------------
	// TypeOrm Specific Types
	// -------------------------------------------------------------------------

	@Column('simple-array')
	simpleArray: string[];

	@Column('simple-json')
	simpleJson: { param: string };

	@Column('simple-enum', { enum: ['A', 'B', 'C'] })
	simpleEnum: string;

	@Column('simple-enum', { enum: FruitEnum })
	simpleClassEnum1: FruitEnum;
}
