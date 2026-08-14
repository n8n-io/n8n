import 'reflect-metadata';
import { expect } from 'chai';
import { Post } from './entity/Post';
import { DataSource } from '../../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';

describe('database schema > column length > postgres', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [Post],
			enabledDrivers: ['postgres'],
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('all types should create with correct size', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				expect(table!.findColumnByName('characterVarying')!.length).to.be.equal('50');
				expect(table!.findColumnByName('varchar')!.length).to.be.equal('50');
				expect(table!.findColumnByName('character')!.length).to.be.equal('50');
				expect(table!.findColumnByName('char')!.length).to.be.equal('50');
			}),
		));

	it('all types should update their size', () =>
		Promise.all(
			connections.map(async (connection) => {
				let metadata = connection.getMetadata(Post);
				metadata.findColumnWithPropertyName('characterVarying')!.length = '100';
				metadata.findColumnWithPropertyName('varchar')!.length = '100';
				metadata.findColumnWithPropertyName('character')!.length = '100';
				metadata.findColumnWithPropertyName('char')!.length = '100';

				await connection.synchronize(false);

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				expect(table!.findColumnByName('characterVarying')!.length).to.be.equal('100');
				expect(table!.findColumnByName('varchar')!.length).to.be.equal('100');
				expect(table!.findColumnByName('character')!.length).to.be.equal('100');
				expect(table!.findColumnByName('char')!.length).to.be.equal('100');
			}),
		));
});
