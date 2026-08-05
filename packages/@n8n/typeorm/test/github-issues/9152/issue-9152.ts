import 'reflect-metadata';
import { expect } from 'chai';
import { Test, ValueUnion } from './entity/Test';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { LessThan } from '../../../src';

describe("github issues > #9152 Can't use LessThan for Union field", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Test],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not raise TypeScript error when LessThan with Union is passed to FindOptionsWhere', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.getRepository(Test).save({
					value: 1,
				});

				const value = 2 as ValueUnion;

				const count = await connection.getRepository(Test).countBy({
					value: LessThan(value),
				});

				expect(count).to.eq(1);
			}),
		));
});
