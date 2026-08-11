import { Column, Entity, OneToMany, PrimaryColumn } from '../../../../src';
import { Zip } from './zip';

@Entity()
export class Country {
	@PrimaryColumn({ length: 2 })
	code: string;

	@Column()
	caption: string;

	@OneToMany(
		() => Zip,
		(zip) => zip.country,
	)
	zips: Zip[];
}
