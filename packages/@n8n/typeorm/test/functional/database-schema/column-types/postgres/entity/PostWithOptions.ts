import { Entity } from '../../../../../../src/decorator/entity/Entity';
import { PrimaryColumn } from '../../../../../../src/decorator/columns/PrimaryColumn';
import { Column } from '../../../../../../src/decorator/columns/Column';

@Entity()
export class PostWithOptions {
	@PrimaryColumn()
	id: number;

	// -------------------------------------------------------------------------
	// Numeric Types
	// -------------------------------------------------------------------------

	@Column('numeric', { precision: 5, scale: 2 })
	numeric: string;

	@Column('decimal', { precision: 5, scale: 2 })
	decimal: string;

	// -------------------------------------------------------------------------
	// Character Types
	// -------------------------------------------------------------------------

	@Column('char', { length: 3 })
	char: string;

	@Column('character', { length: 3 })
	character: string;

	@Column('varchar', { length: 30 })
	varchar: string;

	@Column('character varying', { length: 30 })
	characterVarying: string;

	// -------------------------------------------------------------------------
	// Date Types
	// -------------------------------------------------------------------------

	@Column('timestamp', { precision: 3 })
	timestamp: Date;

	@Column('timestamp with time zone', { precision: 5 })
	timestampWithTimeZone: Date;

	@Column('time', { precision: 3 })
	time: string;

	@Column('time with time zone', { precision: 5 })
	timeWithTimeZone: string;

	@Column('int4range', { nullable: true })
	int4range: string;
}
