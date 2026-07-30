import 'reflect-metadata';
import { DataSource } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { User } from './entity/User';
import { expect } from 'chai';

describe('github issues > #2376 Naming single column unique constraint with decorator not working as expected', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				schemaCreate: true,
				dropSchema: true,
				entities: [User],
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should keep user-specified Unique constraint name', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				const table = await queryRunner.getTable('user');
				await queryRunner.release();

				let unique1 = table!.uniques.find((it) => it.name === 'unique-email');
				let unique2 = table!.uniques.find((it) => it.name === 'unique-email-nickname');

				expect(unique1).to.be.not.undefined;
				expect(unique2).to.be.not.undefined;
			}),
		));
});
