import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { ObjectLiteral } from '../../../src/common/ObjectLiteral';
import { expect } from 'chai';
import { Post } from './entity/Post';
import { DateUtils } from '../../../src/util/DateUtils';

describe('github issues > #513 Incorrect time/datetime types for SQLite', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should create datetime column type for datetime in sqlite', () =>
		Promise.all(
			connections.map(async (connection) => {
				const dbColumns: ObjectLiteral[] =
					await connection.manager.query('PRAGMA table_info(Post)');
				expect(dbColumns).not.to.be.null;
				expect(dbColumns).not.to.be.undefined;

				let columnType: string = '';
				dbColumns.map((dbColumn) => {
					if (dbColumn['name'] === 'dateTimeColumn') {
						columnType = dbColumn['type'];
					}
				});

				// Expect "datetime" type to translate to SQLite affinity type "DATETIME"
				columnType.should.equal('datetime');
			}),
		));

	it('should persist correct type in datetime column in sqlite', () =>
		Promise.all(
			connections.map(async (connection) => {
				const now: Date = new Date();

				const post: Post = new Post();
				post.id = 1;
				post.dateTimeColumn = now;

				await connection.manager.save(post);

				const storedPost = await connection.manager.findOne(Post, {
					where: {
						id: post.id,
					},
				});
				expect(storedPost).to.not.be.null;
				storedPost!.dateTimeColumn.toDateString().should.equal(now.toDateString());
			}),
		));

	it('should create datetime column type for time in sqlite', () =>
		Promise.all(
			connections.map(async (connection) => {
				const dbColumns: ObjectLiteral[] =
					await connection.manager.query('PRAGMA table_info(Post)');
				expect(dbColumns).not.to.be.null;
				expect(dbColumns).not.to.be.undefined;

				let columnType: string = '';
				dbColumns.map((dbColumn) => {
					if (dbColumn['name'] === 'timeColumn') {
						columnType = dbColumn['type'];
					}
				});

				// Expect "time" type to translate to SQLite type "TEXT"
				columnType.should.equal('time');
			}),
		));

	it('should persist correct type in datetime column in sqlite', () =>
		Promise.all(
			connections.map(async (connection) => {
				const now: Date = new Date();

				const post: Post = new Post();
				post.id = 2;
				post.timeColumn = now; // Should maybe use Date type?

				await connection.manager.save(post);

				const storedPost = await connection.manager.findOne(Post, {
					where: {
						id: post.id,
					},
				});
				expect(storedPost).to.not.be.null;

				const expectedTimeString = DateUtils.mixedTimeToString(
					now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds(),
				);
				storedPost!.timeColumn.toString().should.equal(expectedTimeString);
			}),
		));
});
