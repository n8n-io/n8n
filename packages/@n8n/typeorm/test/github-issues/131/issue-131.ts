import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Student } from './entity/Student';
import { Employee } from './entity/Employee';

describe('github issues > #131 Error with single table inheritance query without additional conditions', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not fail when querying for single table inheritance model without additional conditions', () =>
		Promise.all(
			connections.map(async (connection) => {
				const employees = await connection.getRepository(Employee).find();
				expect(employees).not.to.be.undefined;

				const students = await connection.getRepository(Student).find();
				expect(students).not.to.be.undefined;
			}),
		));
});
