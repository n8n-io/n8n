import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/index';
import { expect } from 'chai';

import { CatEntity } from './entity/Cat';
import { AnimalEntity } from './entity/Animal';

describe('github issues > #9033 Cannot manually insert type in discriminator column of parent entity class when\
using single table inheritance when creating instance of parent entity', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('is possible to set the discriminator column manually on the base entity', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const entityManager = dataSource.createEntityManager();
				const animalRepo = entityManager.getRepository(AnimalEntity);

				// Create a base class entity while manually setting discriminator.
				const maybeACat = animalRepo.create({
					name: 'i-am-maybe-a-cat',
					type: 'cat', // This is the discriminator for `CatEntity`.
				});
				await entityManager.save(maybeACat);

				// Load the animal / cat from the database.
				const animals = await animalRepo.find();
				expect(animals.length).to.equal(1);

				expect(animals[0]).to.be.instanceOf(CatEntity);
				expect(animals[0].type).to.equal('cat');
			}),
		));
});
