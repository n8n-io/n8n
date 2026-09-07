import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Customer } from './entity/Customer';
import { Profile } from './entity/Profile';

describe('indices > embeds index test', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	describe('embeddeds index', function () {
		it('should work without errors', () =>
			Promise.all(
				connections.map(async (connection) => {
					const customer = new Customer();
					customer.nameEnglish = 'Umed';
					customer.nameHebrew = 'Uma';
					customer.profile = new Profile();
					customer.profile.job = 'Developer';
					customer.profile.address = 'Anywhere';
					await connection.manager.save(customer);
				}),
			));
	});
});
