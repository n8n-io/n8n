import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource, ObjectLiteral } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Post } from './entity/Post';
import { FruitEnum } from './enum/FruitEnum';

describe('github issues > #3694 Sync enums on schema sync', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should change schema when enum definition changes', () =>
		Promise.all(
			connections.map(async (connection) => {
				const fruitEnum = FruitEnum;
				(fruitEnum as any).Banana = 'BANANA';
				Object.assign(fruitEnum, { Cherry: 'cherry' });
				const metadata = connection.getMetadata(Post);
				const fruitColumn = metadata.columns.find((column) => column.propertyName === 'fruit');
				fruitColumn!.enum = Object.keys(fruitEnum).map((key) => (fruitEnum as ObjectLiteral)[key]);

				await connection.synchronize();

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				expect(table!.findColumnByName('fruit')!.enum).to.deep.equal([
					'apple',
					'pineapple',
					'BANANA',
					'cherry',
				]);
			}),
		));
});
