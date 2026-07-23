import 'reflect-metadata';
import { DataSource } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { Post } from './entity/Post';

describe('github issues > #7479 Only first single quote in comments is escaped', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
				entities: [Post],
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should properly escape quotes in comments', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let table = await queryRunner.getTable('post');
				const column1 = table!.findColumnByName('text')!;
				const column2 = table!.findColumnByName('text2')!;
				const column3 = table!.findColumnByName('text3')!;

				column1.comment!.should.be.equal(`E.g. 'foo', 'bar', or 'baz' etc.`);
				column2.comment!.should.be.equal(`E.g. '''foo, 'bar''', or baz' etc.`);
				column3.comment!.should.be.equal(`E.g. "foo", "bar", or "baz" etc.`);

				await queryRunner.release();
			}),
		));
});
