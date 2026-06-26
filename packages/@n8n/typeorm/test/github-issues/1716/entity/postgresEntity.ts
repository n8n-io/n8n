import { PrimaryColumn, Entity, Column } from '../../../../src';

@Entity()
export class PostgresEntity {
	@PrimaryColumn()
	id: number;

	@Column('time')
	fieldTime: Date;

	@Column('time with time zone')
	fieldTimeWithTimeZone: Date;

	@Column('time without time zone')
	fieldTimeWithoutTimeZone: Date;

	@Column('timestamp')
	fieldTimestamp: Date;

	@Column('timestamp without time zone')
	fieldTimestampWithoutTimeZone: Date;

	@Column('timestamp with time zone')
	fieldTimestampWithTimeZone: Date;
}
