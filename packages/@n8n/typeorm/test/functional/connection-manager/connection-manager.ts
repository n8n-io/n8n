import 'reflect-metadata';
import { expect } from 'chai';
import { setupSingleTestingConnection } from '../../utils/test-utils';
import { ConnectionManager } from '../../../src/connection/ConnectionManager';
import { PrimaryGeneratedColumn } from '../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Column } from '../../../src/decorator/columns/Column';
import { Entity } from '../../../src/decorator/entity/Entity';
import { PostgresDriver } from '../../../src/driver/postgres/PostgresDriver';

describe('ConnectionManager', () => {
	@Entity()
	class Post {
		@PrimaryGeneratedColumn()
		id: number;

		@Column()
		title: string;

		constructor(id: number, title: string) {
			this.id = id;
			this.title = title;
		}
	}

	describe('create', function () {
		it('should create a postgres connection when postgres driver is specified', async () => {
			const options = setupSingleTestingConnection('postgres', {
				name: 'default',
				entities: [],
			});
			if (!options) return;

			const connectionManager = new ConnectionManager();
			const connection = connectionManager.create(options);
			connection.name.should.be.equal('default');
			connection.isInitialized.should.be.false;
			expect(connection.driver).to.be.undefined;

			await connection.initialize();
			connection.isInitialized.should.be.true;
			connection.driver.should.be.instanceOf(PostgresDriver);

			await connection.destroy();
		});
	});

	describe('get', function () {
		it('should give connection with a requested name', () => {
			const options = setupSingleTestingConnection('postgres', {
				name: 'myPostgresConnection',
				entities: [],
			});
			if (!options) return;
			const connectionManager = new ConnectionManager();
			const connection = connectionManager.create(options);
			expect(connection.driver).to.be.undefined;
			connectionManager.get('myPostgresConnection').should.be.equal(connection);
		});

		it('should throw an error if connection with the given name was not found', () => {
			const options = setupSingleTestingConnection('postgres', {
				name: 'myPostgresConnection',
				entities: [],
			});
			if (!options) return;
			const connectionManager = new ConnectionManager();
			const connection = connectionManager.create(options);
			expect(connection.driver).to.be.undefined;
			expect(() => connectionManager.get('nonExistentConnection')).to.throw(Error);
		});
	});

	describe('create connection options', function () {
		it('should not drop the database if dropSchema was not specified', async () => {
			const options = setupSingleTestingConnection('postgres', {
				name: 'myPostgresConnection',
				schemaCreate: true,
				entities: [Post],
			});
			if (!options) return;

			const connectionManager = new ConnectionManager();

			// create connection, save post and close connection
			let connection = await connectionManager.create(options).connect();
			const post = new Post(1, 'Hello post');
			await connection.manager.save(post);
			await connection.close();

			// recreate connection and find previously saved post
			connection = await connectionManager.create(options).connect();
			const loadedPost = (await connection.manager.findOne(Post, {
				where: {
					id: 1,
				},
			}))!;
			loadedPost.should.be.instanceof(Post);
			loadedPost.should.be.eql({ id: 1, title: 'Hello post' });
			await connection.close();
		});

		it('should drop the database if dropSchema was set to true', async () => {
			const options = setupSingleTestingConnection('postgres', {
				name: 'myPostgresConnection',
				schemaCreate: true,
				dropSchema: true,
				entities: [Post],
			});
			if (!options) return;

			const connectionManager = new ConnectionManager();

			// create connection, save post and close connection
			let connection = await connectionManager.create(options).connect();
			const post = new Post(1, 'Hello post');
			await connection.manager.save(post);
			await connection.close();

			// recreate connection and find previously saved post
			connection = await connectionManager.create(options).connect();
			const loadedPost = await connection.manager.findOne(Post, {
				where: {
					id: 1,
				},
			});
			expect(loadedPost).to.be.null;
			await connection.close();
		});
	});
});
