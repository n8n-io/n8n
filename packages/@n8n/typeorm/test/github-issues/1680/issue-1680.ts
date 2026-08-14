import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { User } from './entity/User';
import { expect } from 'chai';

describe('github issues > #1680 Delete & Update applies to all entities in table if criteria is undefined or empty', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	it('Delete & Update should throw an error when supplied with an empty criteria', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userA = new User();
				userA.name = 'User A';
				const userB = new User();
				userB.name = 'User B';
				const userC = new User();
				userC.name = 'User C';

				await connection.manager.save([userA, userB, userC]);

				const problematicCriterias: any[] = [null, undefined, [], ''];

				// Execute potentially problematic deletes
				for (const criteria of problematicCriterias) {
					let error: any = null;

					await connection.manager.delete(User, criteria).catch((err) => (error = err));

					expect(error).to.be.instanceof(Error);
				}

				// Execute potentially problematic updates
				for (const criteria of problematicCriterias) {
					let error: any = null;

					await connection.manager
						.update(User, criteria, {
							name: 'Override Name',
						})
						.catch((err) => (error = err));

					expect(error).to.be.instanceof(Error);
				}

				// Ensure normal deleting works
				await connection.manager.delete(User, 3);

				// Ensure normal updating works
				await connection.manager.update(User, 2, {
					name: 'User B Updated',
				});

				// All users should still exist except for User C
				await connection.manager.find(User, { order: { id: 'asc' } }).should.eventually.eql([
					{
						id: 1,
						name: 'User A',
					},
					{
						id: 2,
						name: 'User B Updated',
					},
				]);
			}),
		));
});
