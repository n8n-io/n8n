import {
	Column,
	Entity,
	JoinTable,
	ManyToMany,
	PrimaryGeneratedColumn,
	RelationId,
} from '../../../../src';
import { Zip } from './zip';

@Entity()
export class City {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	caption: string;

	@RelationId((city: City) => city.zips)
	zipCodes: {
		countryCode: string;
		zipCode: string;
	}[];

	@ManyToMany(
		() => Zip,
		(zip) => zip.cities,
		{
			// cascade: true,
		},
	)
	@JoinTable()
	zips: Zip[];
}
