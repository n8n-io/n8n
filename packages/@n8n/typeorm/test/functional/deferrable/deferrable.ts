import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Company } from './entity/Company';
import { Office } from './entity/Office';
import { User } from './entity/User';
import { expect } from 'chai';

describe('deferrable fk constraints should be check at the end of transaction (#2191)', () => {
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

	it('use initially deferred deferrable fk constraints', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.manager.transaction(async (entityManager) => {
					// first save user
					const user = new User();
					user.id = 1;
					user.company = { id: 100 };
					user.name = 'Bob';

					await entityManager.save(user);

					// then save company
					const company = new Company();
					company.id = 100;
					company.name = 'Acme';

					await entityManager.save(company);
				});

				// now check
				const user = await connection.manager.findOne(User, {
					relations: { company: true },
					where: { id: 1 },
				});

				expect(user).not.to.be.null;

				user!.should.be.eql({
					id: 1,
					name: 'Bob',
					company: {
						id: 100,
						name: 'Acme',
					},
				});
			}),
		));

	it('use initially immediated deferrable fk constraints', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.manager.transaction(async (entityManager) => {
					// first set constraints deferred manually
					await entityManager.query('SET CONSTRAINTS ALL DEFERRED');

					// now save office
					const office = new Office();
					office.id = 2;
					office.company = { id: 200 };
					office.name = 'Barcelona';

					await entityManager.save(office);

					// then save company
					const company = new Company();
					company.id = 200;
					company.name = 'Emca';

					await entityManager.save(company);
				});

				// now check
				const office = await connection.manager.findOne(Office, {
					relations: { company: true },
					where: { id: 2 },
				});

				expect(office).not.to.be.null;

				office!.should.be.eql({
					id: 2,
					name: 'Barcelona',
					company: {
						id: 200,
						name: 'Emca',
					},
				});
			}),
		));
});
