import '../../utils/test-setup';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { expect } from 'chai';
import { DummyHSTOREEntity } from './entity/hstore-entity';

describe('other issues > allow HSTORE column type to use transformers', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should use the transformer set in the column options', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repository = connection.getRepository(DummyHSTOREEntity);

				const translation = {
					en_US: 'hello',
					fr_FR: 'salut',
				};

				const dummy = repository.create({
					translation,
				});

				await repository.save(dummy);

				const dummyEntity = await repository.findOneByOrFail({
					id: dummy.id,
				});
				expect(dummyEntity.translation).to.equal('hello');
			}),
		));
});
