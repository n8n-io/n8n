import 'reflect-metadata';
import { DataSource } from '../../../../src/data-source/DataSource';
import { ConnectionMetadataBuilder } from '../../../../src/connection/ConnectionMetadataBuilder';
import { EntityMetadataValidator } from '../../../../src/metadata-builder/EntityMetadataValidator';
import { DriverFactory } from '../../../../src/driver/DriverFactory';
import { expect } from 'chai';

describe('entity-metadata-validator', () => {
	it('should throw error if relation count decorator used with ManyToOne or OneToOne relations', async () => {
		const connection = new DataSource({
			// dummy connection options, connection won't be established anyway
			type: 'postgres',
			host: 'localhost',
			username: 'test',
			password: 'test',
			database: 'test',
			entities: [__dirname + '/entity/*{.js,.ts}'],
		});
		connection.driver = await DriverFactory.create(connection);
		const connectionMetadataBuilder = new ConnectionMetadataBuilder(connection);
		const entityMetadatas = await connectionMetadataBuilder.buildEntityMetadatas([
			__dirname + '/entity/*{.js,.ts}',
		]);
		const entityMetadataValidator = new EntityMetadataValidator();
		expect(() => entityMetadataValidator.validateMany(entityMetadatas, connection.driver)).to.throw(
			Error,
		);
	});
});
