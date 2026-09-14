import 'reflect-metadata';
import { DataSource } from '../../../../src/data-source/DataSource';
import { ConnectionMetadataBuilder } from '../../../../src/connection/ConnectionMetadataBuilder';
import { EntityMetadataValidator } from '../../../../src/metadata-builder/EntityMetadataValidator';
import { expect } from 'chai';
import { InitializedRelationError } from '../../../../src/error/InitializedRelationError';
import { DriverFactory } from '../../../../src/driver/DriverFactory';
import { Category } from './entity/Category';
import { Post } from './entity/Post';
import { Image } from './entity/Image';
import { ImageInfo } from './entity/ImageInfo';
import { Question } from './entity/Question';

describe('entity-metadata-validator > initialized relations', () => {
	it('should throw error if relation with initialized array was found on many-to-many relation', async () => {
		const connection = new DataSource({
			// dummy connection options, connection won't be established anyway
			type: 'postgres',
			host: 'localhost',
			username: 'test',
			password: 'test',
			database: 'test',
			entities: [Post, Category],
		});
		connection.driver = await DriverFactory.create(connection);
		const connectionMetadataBuilder = new ConnectionMetadataBuilder(connection);
		const entityMetadatas = await connectionMetadataBuilder.buildEntityMetadatas([Post, Category]);
		const entityMetadataValidator = new EntityMetadataValidator();
		expect(() => entityMetadataValidator.validateMany(entityMetadatas, connection.driver)).to.throw(
			InitializedRelationError,
		);
	});

	it('should throw error if relation with initialized array was found on one-to-many relation', async () => {
		const connection = new DataSource({
			// dummy connection options, connection won't be established anyway
			type: 'postgres',
			host: 'localhost',
			username: 'test',
			password: 'test',
			database: 'test',
			entities: [Image, ImageInfo],
		});
		connection.driver = await DriverFactory.create(connection);
		const connectionMetadataBuilder = new ConnectionMetadataBuilder(connection);
		const entityMetadatas = await connectionMetadataBuilder.buildEntityMetadatas([
			Image,
			ImageInfo,
		]);
		const entityMetadataValidator = new EntityMetadataValidator();
		expect(() => entityMetadataValidator.validateMany(entityMetadatas, connection.driver)).to.throw(
			InitializedRelationError,
		);
	});

	it('should not throw error if relation with initialized array was not found', async () => {
		const connection = new DataSource({
			// dummy connection options, connection won't be established anyway
			type: 'postgres',
			host: 'localhost',
			username: 'test',
			password: 'test',
			database: 'test',
			entities: [Category],
		});
		connection.driver = await DriverFactory.create(connection);
		const connectionMetadataBuilder = new ConnectionMetadataBuilder(connection);
		const entityMetadatas = await connectionMetadataBuilder.buildEntityMetadatas([Category]);
		const entityMetadataValidator = new EntityMetadataValidator();
		expect(() =>
			entityMetadataValidator.validateMany(entityMetadatas, connection.driver),
		).not.to.throw(InitializedRelationError);
	});

	it('should not throw error if relation with initialized array was found, but persistence for this relation was disabled', async () => {
		const connection = new DataSource({
			// dummy connection options, connection won't be established anyway
			type: 'postgres',
			host: 'localhost',
			username: 'test',
			password: 'test',
			database: 'test',
			entities: [Question, Category],
		});
		connection.driver = await DriverFactory.create(connection);
		const connectionMetadataBuilder = new ConnectionMetadataBuilder(connection);
		const entityMetadatas = await connectionMetadataBuilder.buildEntityMetadatas([
			Question,
			Category,
		]);
		const entityMetadataValidator = new EntityMetadataValidator();
		expect(() =>
			entityMetadataValidator.validateMany(entityMetadatas, connection.driver),
		).not.to.throw(InitializedRelationError);
	});
});
