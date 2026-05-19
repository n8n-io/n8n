import 'reflect-metadata';
import { closeTestingConnections, createTestingConnections } from '../../../utils/test-utils';
import { Post } from './entity/Post';
import { LessThan, DataSource } from '../../../../src';
import { expect } from 'chai';

describe('repository > aggregate methods', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [Post],
			schemaCreate: true,
			dropSchema: true,
		});

		await Promise.all(
			connections.map(async (connection) => {
				for (let i = 0; i < 100; i++) {
					const post = new Post();
					post.id = i;
					post.counter = i + 1;
					await connection.getRepository(Post).save(post);
				}
			}),
		);
	});

	after(() => closeTestingConnections(connections));

	describe('sum', () => {
		it('should return the aggregate sum', () =>
			Promise.all(
				connections.map(async (connection) => {
					const sum = await connection.getRepository(Post).sum('counter');
					expect(sum).to.equal(5050);
				}),
			));

		it('should return null when 0 rows match the query', () =>
			Promise.all(
				connections.map(async (connection) => {
					const sum = await connection.getRepository(Post).sum('counter', { id: LessThan(0) });
					expect(sum).to.be.null;
				}),
			));
	});

	describe('average', () => {
		it('should return the aggregate average', () =>
			Promise.all(
				connections.map(async (connection) => {
					const average = await connection.getRepository(Post).average('counter');
					// Some RDBMSs (e.g. SQL Server) will return an int when averaging an int column, so either
					// answer is acceptable.
					expect([50, 50.5]).to.include(average);
				}),
			));

		it('should return null when 0 rows match the query', () =>
			Promise.all(
				connections.map(async (connection) => {
					const average = await connection.getRepository(Post).average('counter', {
						id: LessThan(0),
					});
					expect(average).to.be.null;
				}),
			));
	});

	describe('minimum', () => {
		it('should return the aggregate minimum', () =>
			Promise.all(
				connections.map(async (connection) => {
					const minimum = await connection.getRepository(Post).minimum('counter');
					expect(minimum).to.equal(1);
				}),
			));

		it('should return null when 0 rows match the query', () =>
			Promise.all(
				connections.map(async (connection) => {
					const minimum = await connection.getRepository(Post).minimum('counter', {
						id: LessThan(0),
					});
					expect(minimum).to.be.null;
				}),
			));
	});

	describe('maximum', () => {
		it('should return the aggregate maximum', () =>
			Promise.all(
				connections.map(async (connection) => {
					const maximum = await connection.getRepository(Post).maximum('counter');
					expect(maximum).to.equal(100);
				}),
			));

		it('should return null when 0 rows match the query', () =>
			Promise.all(
				connections.map(async (connection) => {
					const maximum = await connection.getRepository(Post).maximum('counter', {
						id: LessThan(0),
					});
					expect(maximum).to.be.null;
				}),
			));
	});
});
