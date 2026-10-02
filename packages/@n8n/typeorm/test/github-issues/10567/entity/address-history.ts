import { Column, Entity, Index, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class AddressHistory {
	@PrimaryGeneratedColumn('uuid')
	uuid: string;

	@Index()
	@Column({ type: 'uuid' })
	entityUuid: string;

	@Index()
	@Column({ type: 'uuid' })
	addressUuid: string;

	@Index({ spatial: true })
	@Column({ type: 'int4range' })
	int4range: string;

	@Index({ spatial: true })
	@Column({ type: 'int8range' })
	int8range: string;

	@Index({ spatial: true })
	@Column({ type: 'numrange' })
	numrange: string;

	@Index({ spatial: true })
	@Column({ type: 'tsrange' })
	tsrange: string;

	@Index({ spatial: true })
	@Column({ type: 'tstzrange' })
	tstzrange: string;

	@Index({ spatial: true })
	@Column({ type: 'daterange' })
	daterange: string;

	@Index({ spatial: true })
	@Column({
		type: 'geometry',
		spatialFeatureType: 'Point',
		srid: 4326,
		nullable: true,
	})
	point: string;
}
