import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Tournament } from './entity/Tournament';

describe('github issues > #807 Error in persisting dates', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should be able to save dates as objects', () =>
		Promise.all(
			connections.map(async (connection) => {
				const tournament = new Tournament();
				tournament.name = 'One';
				tournament.startDate = new Date();
				tournament.endDate = new Date();
				await connection.manager.save(tournament);
			}),
		));

	it('should be able to save dates as strings', () =>
		Promise.all(
			connections.map(async (connection) => {
				const tournament = Object.assign(new Tournament(), {
					name: 'One',
					startDate: '2017-08-28T00:00:00.000Z',
					endDate: '2017-08-31T23:59:59.999Z',
				});
				await connection.manager.save(tournament);
			}),
		));
});
