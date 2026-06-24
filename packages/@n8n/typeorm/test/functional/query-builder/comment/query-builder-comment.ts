import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Test } from './entity/Test';
import { expect } from 'chai';

describe('query builder > comment', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Test],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should scrub end comment pattern from string', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager
					.createQueryBuilder(Test, 'test')
					.comment('Hello World */ */')
					.getSql();

				expect(sql).to.match(/^\/\* Hello World   \*\/ /);
			}),
		));

	it('should not allow an empty comment', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager.createQueryBuilder(Test, 'test').comment('').getSql();

				expect(sql).to.not.match(/^\/\* Hello World  \*\/ /);
			}),
		));

	it('should allow a comment with just whitespaces', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager.createQueryBuilder(Test, 'test').comment(' ').getSql();

				expect(sql).to.match(/^\/\*   \*\/ /);
			}),
		));

	it('should allow a multi-line comment', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager
					.createQueryBuilder(Test, 'test')
					.comment("Hello World\nIt's a beautiful day!")
					.getSql();

				expect(sql).to.match(/^\/\* Hello World\nIt's a beautiful day! \*\/ /);
			}),
		));

	it('should include comment in select', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager
					.createQueryBuilder(Test, 'test')
					.comment('Hello World')
					.getSql();

				expect(sql).to.match(/^\/\* Hello World \*\/ /);
			}),
		));

	it('should include comment in update', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager
					.createQueryBuilder(Test, 'test')
					.update()
					.set({ id: 2 })
					.comment('Hello World')
					.getSql();

				expect(sql).to.match(/^\/\* Hello World \*\/ /);
			}),
		));

	it('should include comment in insert', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager
					.createQueryBuilder(Test, 'test')
					.insert()
					.values({ id: 1 })
					.comment('Hello World')
					.getSql();

				expect(sql).to.match(/^\/\* Hello World \*\/ /);
			}),
		));

	it('should include comment in delete', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager
					.createQueryBuilder(Test, 'test')
					.delete()
					.comment('Hello World')
					.getSql();

				expect(sql).to.match(/^\/\* Hello World \*\/ /);
			}),
		));
});
