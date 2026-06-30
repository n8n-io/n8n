import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { Animal } from './entity/Animal';

describe('github issues > #1355 Allow explicitly named primary keys, foreign keys, and indices', () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => {
		return reloadTestingDatabases(connections);
	});
	after(() => closeTestingConnections(connections));

	it('should set foreign keys their names to given names', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.getRepository(Animal).find();

				let metadata = connection.getMetadata(Animal);

				const joinTable = metadata.ownRelations[0];
				expect(joinTable.foreignKeys[0].name).to.eq('fk_animal_category_categoryId');
				expect(joinTable.foreignKeys[1].name).to.eq('fk_animal_category_animalId');
				expect(metadata.foreignKeys[0].name).to.eq('fk_animal_breedId');
			}),
		));
});
