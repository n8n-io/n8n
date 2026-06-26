import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Test } from './entity/Test';

describe('columns > comments', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Test],
				// Only supported on cockroachdb, mysql, postgres, and sap
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should persist comments of different types to the database', () =>
		Promise.all(
			connections.map(async (connection) => {
				const table = (await connection.createQueryRunner().getTable('test'))!;

				expect(table.findColumnByName('a')!.comment).to.be.equal('Hello World');
				expect(table.findColumnByName('b')!.comment).to.be.equal('Hello\nWorld');
				expect(table.findColumnByName('c')!.comment).to.be.equal(
					"Hello World! It's going to be a beautiful day.",
				);
				expect(table.findColumnByName('d')!.comment).to.be.equal('Hello World! #@!$`');
				expect(table.findColumnByName('e')!.comment).to.be.equal('Hello World. \r\n\t\b\f\v');
				expect(table.findColumnByName('f')!.comment).to.be.equal('Hello World.\\');
				expect(table.findColumnByName('g')!.comment).to.be.equal(' ');
				expect(table.findColumnByName('h')!.comment).to.be.equal(undefined);
				expect(table.findColumnByName('i')!.comment).to.be.equal(undefined);
			}),
		));
});
