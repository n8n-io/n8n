import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Post } from './entity/Post';
import { Example } from './entity/Example';
import { Between } from '../../../src';

describe("github issues > #2286 find operators like MoreThan and LessThan doesn't work properly for date fields", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Post, Example],
				schemaCreate: true,
				dropSchema: true,
				/* Test not eligible for better-sql where binding Dates is impossible */
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));

	after(() => closeTestingConnections(connections));

	it('should find a record by its datetime value with find options', () =>
		Promise.all(
			connections.map(async (connection) => {
				const start = new Date('2000-01-01');
				const end = new Date('2001-01-01');
				const middle = new Date('2000-06-30');
				const post = new Post();
				post.dateTimeColumn = middle;

				await connection.manager.save(post);

				const postByDateEquals = await connection.manager.findOneBy(Post, {
					dateTimeColumn: middle,
				});
				expect(postByDateEquals).to.not.be.undefined;

				const postByDateBetween = await connection.manager.findOneBy(Post, {
					dateTimeColumn: Between(start, end),
				});
				expect(postByDateBetween).to.not.be.undefined;
			}),
		));

	it('should find a record by its datetime value with query builder', () =>
		Promise.all(
			connections.map(async (connection) => {
				const now = new Date();
				const post = new Post();
				post.dateTimeColumn = now;

				await connection.manager.save(post);

				const postByDateEquals = await connection.manager
					.getRepository(Post)
					.createQueryBuilder('post')
					.where('post.dateTimeColumn = :now', { now })
					.getOne();
				expect(postByDateEquals).to.not.be.undefined;
			}),
		));

	it('should save, update, and load with a date PK', () =>
		Promise.all(
			connections.map(async (connection) => {
				const start = new Date('2000-01-01');
				const middle = new Date('2000-06-30');
				const end = new Date('2001-01-01');

				await connection.manager.save(Example, {
					id: start,
					text: 'start',
				});
				await connection.manager.save(Example, {
					id: middle,
					text: 'middle',
				});
				await connection.manager.save(Example, { id: end, text: 'end' });

				const repo = connection.manager.getRepository(Example);

				let example = await repo.findOneByOrFail({ id: middle });

				expect(example.text).to.be.equal('middle');

				example.text = 'in between';

				await repo.save(example);

				example = await repo.findOneByOrFail({ id: middle });

				expect(example.text).to.be.equal('in between');
			}),
		));
});
