import sinon from 'sinon';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { EntityManager, QueryRunner, SimpleConsoleLogger } from '../../../src';
import { Foo } from './entity/Foo';
import { expect } from 'chai';
import { PostgresDriver } from '../../../src/driver/postgres/PostgresDriver';

describe('github issues > #2216 - Ability to capture Postgres notifications in logger', () => {
	let connections: DataSource[];
	let queryRunner: QueryRunner;
	let manager: EntityManager;
	let logInfoStub: sinon.SinonStub;

	before(() => {
		logInfoStub = sinon.stub(SimpleConsoleLogger.prototype, 'log');
	});
	beforeEach(async () => {
		await reloadTestingDatabases(connections);
	});
	afterEach(() => logInfoStub.resetHistory());
	after(() => logInfoStub.restore());

	describe('when logNotifications option is NOT enabled', () => {
		before(async () => {
			connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				entities: [Foo],
				createLogger: () => new SimpleConsoleLogger(),
			});
		});
		after(() => closeTestingConnections(connections));

		it('should NOT pass extension setup notices to client', async () =>
			Promise.all(
				connections.map(async (connection) => {
					sinon.assert.neverCalledWith(
						logInfoStub,
						'info',
						`extension "uuid-ossp" already exists, skipping`,
					);
					sinon.assert.neverCalledWith(
						logInfoStub,
						'info',
						`extension "citext" already exists, skipping`,
					);
				}),
			));

		it('should NOT pass manual notices to client', async () =>
			Promise.all(
				connections.map(async (connection) => {
					queryRunner = connection.createQueryRunner();
					await queryRunner.query(`DO $do$ BEGIN RAISE NOTICE 'this is a notice'; END $do$`);
					sinon.assert.neverCalledWith(logInfoStub, 'info', 'this is a notice');
					await queryRunner.release();
				}),
			));

		it("should NOT pass 'listen -> notify' messages to client", async () =>
			Promise.all(
				connections.map(async (connection) => {
					queryRunner = connection.createQueryRunner();
					await queryRunner.query('LISTEN foo;');
					await queryRunner.query("NOTIFY foo, 'bar!'");
					sinon.assert.neverCalledWith(
						logInfoStub,
						'info',
						'Received NOTIFY on channel foo: bar!.',
					);
					await queryRunner.release();
				}),
			));
	});

	describe('when logNotifications option is enabled', () => {
		before(async () => {
			connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				entities: [Foo],
				createLogger: () => new SimpleConsoleLogger(),
				driverSpecific: { logNotifications: true },
			});
		});
		after(() => closeTestingConnections(connections));

		it('should pass extension setup notices to client', async () =>
			Promise.all(
				connections
					.filter((connection) => {
						if (connection.driver instanceof PostgresDriver) {
							// the native driver does not emit notice events, but logs them itself instead
							if (connection.driver.isNative) {
								return false;
							}
						}
						return true;
					})
					.map(async (connection) => {
						sinon.assert.calledWith(
							logInfoStub,
							'info',
							`extension "uuid-ossp" already exists, skipping`,
						);
						sinon.assert.calledWith(
							logInfoStub,
							'info',
							`extension "citext" already exists, skipping`,
						);
					}),
			));

		it('should pass manual notices to client', async () =>
			Promise.all(
				connections
					.filter((connection) => {
						if (connection.driver instanceof PostgresDriver) {
							// the native driver does not emit notice events, but logs them itself instead
							if (connection.driver.isNative) {
								return false;
							}
						}
						return true;
					})
					.map(async (connection) => {
						queryRunner = connection.createQueryRunner();
						await queryRunner.query(`DO $do$ BEGIN RAISE NOTICE 'this is a notice'; END $do$`);
						sinon.assert.calledWith(logInfoStub, 'info', 'this is a notice');
						await queryRunner.release();
					}),
			));

		it("should pass 'listen -> notify' messages to client", async () =>
			Promise.all(
				connections
					.filter((connection) => {
						if (connection.driver instanceof PostgresDriver) {
							// the native driver does not emit notice events, but logs them itself instead
							if (connection.driver.isNative) {
								return false;
							}
						}
						return true;
					})
					.map(async (connection) => {
						queryRunner = connection.createQueryRunner();
						await queryRunner.query('LISTEN foo;');
						await queryRunner.query("NOTIFY foo, 'bar!'");
						sinon.assert.calledWith(logInfoStub, 'info', 'Received NOTIFY on channel foo: bar!.');
						await queryRunner.release();
					}),
			));

		it('should not interfere with actual queries', async () =>
			Promise.all(
				connections.map(async (connection) => {
					manager = connection.manager;
					const foo = new Foo();
					await manager.save(
						Object.assign(foo, {
							lowercaseval: 'foo',
							lowercaseval2: 'bar',
						}),
					);
					const loadedFoo = await manager.findOneBy(Foo, {
						uuid: foo.uuid,
					});
					expect(loadedFoo).not.to.be.null;
					expect(loadedFoo).to.contain({
						lowercaseval: 'foo',
						lowercaseval2: 'bar',
					});
				}),
			));
	});
});
