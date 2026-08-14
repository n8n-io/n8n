import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from '../../functional/query-builder/update/entity/User';
import { EntityPropertyNotFoundError } from '../../../src/error/EntityPropertyNotFoundError';

describe('github issues > #3416 Unknown fields are stripped from WHERE clause', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [User],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	describe('should throw FindCriteriaNotFoundError when supplying unknown property in where criteria', () => {
		it('find', () =>
			Promise.all(
				connections.map(async (connection) => {
					let error: Error | undefined;
					try {
						await connection.manager.findOneBy(User, {
							// @ts-expect-error
							unknownProp: 'John Doe',
						});
					} catch (err) {
						error = err;
					}
					expect(error).to.be.an.instanceof(EntityPropertyNotFoundError);
				}),
			));
		it('update', () =>
			Promise.all(
				connections.map(async (connection) => {
					let error: Error | undefined;
					try {
						await connection.manager.update(
							User,
							{ unknownProp: 'Something' },
							{ name: 'John doe ' },
						);
					} catch (err) {
						error = err;
					}
					expect(error).to.be.an.instanceof(EntityPropertyNotFoundError);
				}),
			));
		it('delete', () =>
			Promise.all(
				connections.map(async (connection) => {
					let error: Error | undefined;
					try {
						await connection.manager.delete(User, {
							unknownProp: 'Something',
						});
					} catch (err) {
						error = err;
					}
					expect(error).to.be.an.instanceof(EntityPropertyNotFoundError);
				}),
			));
	});
});
