import '../../utils/test-setup';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { expect } from 'chai';
import { City } from './entity/city';
import { Zip } from './entity/zip';
import { Country } from './entity/country';
import { DataSource } from '../../../src';

describe('github issues > #8892 ManyToMany relations save throws "Violation of PRIMARY KEY constraint"', async () => {
	let connections: DataSource[];

	beforeEach(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	afterEach(() => closeTestingConnections(connections));

	it('should work perfectly with with many to many relation with primary key from related object is a primary key from an many to one relation', async () =>
		await Promise.all(
			connections.map(async (connection) => {
				const cityRepository = connection.getRepository(City);
				const countryRepository = connection.getRepository(Country);

				const country = new Country();
				country.code = 'de';
				country.caption = 'Germany';

				const city = new City();
				city.caption = 'Test city';

				const zip1 = new Zip();
				zip1.countryCode = 'de';
				zip1.code = '12345';

				const zip2 = new Zip();
				zip2.countryCode = 'de';
				zip2.code = '54321';

				await countryRepository.save(country);
				await cityRepository.save(city);

				const zipRepository = connection.getRepository(Zip);
				await zipRepository.save(zip1);
				await zipRepository.save(zip2);

				await cityRepository.save({
					id: city.id,
					zips: [zip1, zip2],
				});

				await cityRepository.save({
					id: city.id,
					zips: [zip2],
				});

				const existingCity = await cityRepository.find({
					where: {
						id: city.id,
					},
					relations: {
						zips: true,
					},
				});

				if (!existingCity.length) throw new Error('city not found');

				expect(existingCity[0].zips.length).to.deep.equal(1);
				expect(existingCity[0].zips[0].code).to.deep.equal(zip2.code);
				expect(existingCity[0].zipCodes[0]).to.deep.equal({
					countryCode: zip2.countryCode,
					code: zip2.code,
				});
			}),
		));
});
