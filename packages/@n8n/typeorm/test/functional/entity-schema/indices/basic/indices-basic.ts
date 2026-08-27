import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { EntityMetadata } from '../../../../../src/metadata/EntityMetadata';
import { IndexMetadata } from '../../../../../src/metadata/IndexMetadata';
import { expect } from 'chai';
import { PersonSchema } from './entity/Person';

describe('entity-schema > indices > basic', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [<any>PersonSchema],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should create a non unique index with 2 columns', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('person');
				await queryRunner.release();

				expect(table!.indices.length).to.be.equal(1);
				expect(table!.indices[0].name).to.be.equal('IDX_TEST');
				expect(table!.indices[0].isUnique).to.be.false;
				expect(table!.indices[0].columnNames.length).to.be.equal(2);
				expect(table!.indices[0].columnNames).to.deep.include.members(['FirstName', 'LastName']);
			}),
		));

	it('should update the index to be unique', () =>
		Promise.all(
			connections.map(async (connection) => {
				const entityMetadata = connection.entityMetadatas.find((x) => x.name === 'Person');
				const indexMetadata = entityMetadata!.indices.find((x) => x.name === 'IDX_TEST');
				indexMetadata!.isUnique = true;

				await connection.synchronize(false);

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('person');
				await queryRunner.release();

				expect(table!.indices.length).to.be.equal(1);
				expect(table!.indices[0].name).to.be.equal('IDX_TEST');
				expect(table!.indices[0].isUnique).to.be.true;
				expect(table!.indices[0].columnNames.length).to.be.equal(2);
				expect(table!.indices[0].columnNames).to.deep.include.members(['FirstName', 'LastName']);
			}),
		));

	it('should update the index swaping the 2 columns', () =>
		Promise.all(
			connections.map(async (connection) => {
				const entityMetadata = connection.entityMetadatas.find((x) => x.name === 'Person');
				entityMetadata!.indices = [
					new IndexMetadata({
						entityMetadata: <EntityMetadata>entityMetadata,
						args: {
							target: entityMetadata!.target,
							name: 'IDX_TEST',
							columns: ['LastName', 'FirstName'],
							unique: false,
							synchronize: true,
						},
					}),
				];
				entityMetadata!.indices.forEach((index) => index.build(connection.namingStrategy));

				await connection.synchronize(false);

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('person');
				await queryRunner.release();

				expect(table!.indices.length).to.be.equal(1);
				expect(table!.indices[0].name).to.be.equal('IDX_TEST');
				expect(table!.indices[0].isUnique).to.be.false;
				expect(table!.indices[0].columnNames.length).to.be.equal(2);
				expect(table!.indices[0].columnNames).to.deep.include.members(['FirstName', 'LastName']);
			}),
		));
});
