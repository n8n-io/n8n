import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { Thing, EmbeddedInThing } from './entity/thing';
import { expect } from 'chai';

describe('github issues > #1825 Invalid field values being loaded with long camelCased embedded field names.', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load valid values in embedded with long field names', () =>
		Promise.all(
			connections.map(async (connection) => {
				const thingRepository = connection.getRepository(Thing);

				const thing = new Thing();
				const embeddedThing = new EmbeddedInThing();
				embeddedThing.someSeriouslyLongFieldNameFirst = 1;
				embeddedThing.someSeriouslyLongFieldNameSecond = 2;
				thing.embeddedThing = embeddedThing;

				await thingRepository.save(thing);

				const loadedThing = await thingRepository.findOneBy({
					id: thing.id,
				});

				expect(loadedThing).to.eql(thing);
			}),
		));
});
