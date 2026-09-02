import 'reflect-metadata';
import { DataSource } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { Post } from './entity/Post';

describe('github issues > #7521 Only first \0 is removed in comments, only first \\ is escaped etc.', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				schemaCreate: false,
				dropSchema: true,
				entities: [Post],
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should recognize model changes', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.greaterThan(0);
				sqlInMemory.downQueries.length.should.be.greaterThan(0);
			}),
		));

	it('should not generate queries when no model changes', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.driver.createSchemaBuilder().build();
				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.equal(0);
				sqlInMemory.downQueries.length.should.be.equal(0);
			}),
		));

	it('should properly escape quotes in comments', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let table = await queryRunner.getTable('post');
				const col1 = table!.findColumnByName('col1')!;
				const col2 = table!.findColumnByName('col2')!;
				const col3 = table!.findColumnByName('col3')!;
				const col4 = table!.findColumnByName('col4')!;
				const col5 = table!.findColumnByName('col5')!;
				const col6 = table!.findColumnByName('col6')!;
				const col7 = table!.findColumnByName('col7')!;
				const col8 = table!.findColumnByName('col8')!;
				const col9 = table!.findColumnByName('col9')!;

				col1.comment!.should.be.equal(`E.g. 'foo', 'bar', or 'baz' etc.`);
				col2.comment!.should.be.equal(`E.g. '''foo, 'bar''', or baz' etc.`);
				col3.comment!.should.be.equal(`E.g. "foo", "bar", or "baz" etc.`);
				col4.comment!.should.be.equal('foo\\bar, bar\\baz, foo\\\\baz');
				col5.comment!.should.be.equal(`foo: , bar: `);
				col6.comment!.should.be.equal(`"foo", ""bar""`);
				col7.comment!.should.be.equal('"foo", ""bar""');
				col8.comment!.should.be.equal('foo \r \n \b \t Z % _ bar');
				col9.comment!.should.be.equal('foo \\r \\n \\b \\t \\Z \\% \\_ bar');

				await queryRunner.release();
			}),
		));
});
