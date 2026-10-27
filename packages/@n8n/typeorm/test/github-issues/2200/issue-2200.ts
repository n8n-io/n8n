import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Booking } from './entity/Booking';
import { NamingStrategyUnderTest } from './naming/NamingStrategyUnderTest';

describe('github issue > #2200 Bug - Issue with snake_case naming strategy', () => {
	let connections: DataSource[];
	let namingStrategy = new NamingStrategyUnderTest();

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				namingStrategy,
			})),
	);
	beforeEach(() => {
		return reloadTestingDatabases(connections);
	});
	after(() => closeTestingConnections(connections));

	it('Renammed alias allow to query correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.getRepository(Booking).find({ take: 10 });
			}),
		));
});
