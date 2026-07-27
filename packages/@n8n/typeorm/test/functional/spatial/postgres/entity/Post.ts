import {
	Column,
	Entity,
	Geography,
	Geometry,
	Index,
	Point,
	PrimaryGeneratedColumn,
} from '../../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('geometry', {
		nullable: true,
	})
	@Index({
		spatial: true,
	})
	geom: Geometry;

	@Column('geometry', {
		nullable: true,
		spatialFeatureType: 'Point',
	})
	pointWithoutSRID: Point;

	@Column('geometry', {
		nullable: true,
		spatialFeatureType: 'Point',
		srid: 4326,
	})
	point: Point;

	@Column('geography', {
		nullable: true,
	})
	geog: Geography;
}
