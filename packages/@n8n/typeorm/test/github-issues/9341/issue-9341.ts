import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { TestEntity } from './entity/TestEntity';

describe('github issues > #9341 "bigNumberStrings:false" is not working for postgres', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
				driverSpecific: {
					parseInt8: true,
				},
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should fetch big int as number not string when using parseInt8=true', async () => {
		for (const connection of connections) {
			const origin = await connection.getRepository(TestEntity).save({
				big_int: Number.MAX_SAFE_INTEGER,
				big_decimal: 1.23456789,
			});

			const result = await connection.getRepository(TestEntity).findOne({
				where: { id: origin.id },
			});

			// count also returns bigint (as string by default)
			const [{ count }] = await connection.query(
				`select count(*) from (VALUES (1), (2), (3)) as tmp`,
			);

			// big int should be number
			expect(typeof result?.big_int).to.eq('number');
			expect(result?.big_int).to.eq(Number.MAX_SAFE_INTEGER);
			// big decimal should remain string, only int8 is parsed
			expect(typeof result?.big_decimal).to.eq('string');
			expect(result?.big_decimal).to.eq('1.23456789');
			// count should be number (it is int8)
			expect(typeof count).to.eq('number');
			expect(count).to.eq(3);
		}
	});
});
