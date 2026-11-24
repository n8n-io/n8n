import { DataSource } from '../../../../src';
import {
	createTestingConnections,
	reloadTestingDatabases,
	closeTestingConnections,
} from '../../../utils/test-utils';

describe('escape sqlite query parameters', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should transform boolean parameters with value `true` into `1`', () =>
		Promise.all(
			connections.map((connection) => {
				const [_, parameters] = connection.driver.escapeQueryWithParameters(
					'SELECT nothing FROM irrelevant WHERE a = :param1',
					{ param1: true },
					{},
				);

				parameters.should.eql([1]);
			}),
		));

	it('should transform boolean parameters with value `false` into `0`', () =>
		Promise.all(
			connections.map((connection) => {
				const [_, parameters] = connection.driver.escapeQueryWithParameters(
					'SELECT nothing FROM irrelevant WHERE a = :param1',
					{ param1: false },
					{},
				);

				parameters.should.eql([0]);
			}),
		));

	it('should transform boolean nativeParameters with value `true` into `1`', () =>
		Promise.all(
			connections.map((connection) => {
				const [_, parameters] = connection.driver.escapeQueryWithParameters(
					'SELECT nothing FROM irrelevant',
					{},
					{ nativeParam1: true },
				);

				parameters.should.eql([1]);
			}),
		));

	it('should transform boolean nativeParameters with value `false` into 0', () =>
		Promise.all(
			connections.map((connection) => {
				const [_, parameters] = connection.driver.escapeQueryWithParameters(
					'SELECT nothing FROM irrelevant',
					{},
					{ nativeParam1: false },
				);

				parameters.should.eql([0]);
			}),
		));
});
