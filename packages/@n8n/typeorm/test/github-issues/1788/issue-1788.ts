import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { Provider } from './entity/Provider';
import { Personalization } from './entity/Personalization';
import { expect } from 'chai';

describe('github issues > #1788 One to One does not load relationships.', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work as expected when using find* methods with relations explicitly provided', () =>
		Promise.all(
			connections.map(async (connection) => {
				const personalizationRepository = connection.getRepository(Personalization);
				const providerRepository = connection.getRepository(Provider);
				const personalization = personalizationRepository.create({
					logo: 'https://typeorm.io/logo.png',
				});
				await personalizationRepository.save(personalization);

				const provider = providerRepository.create({
					name: 'Provider',
					description: 'Desc',
					personalization,
				});

				await providerRepository.save(provider);

				const dbProvider = await providerRepository.find({
					relations: { personalization: true },
				});

				expect(dbProvider[0].personalization).to.not.eql(undefined);
			}),
		));
});
