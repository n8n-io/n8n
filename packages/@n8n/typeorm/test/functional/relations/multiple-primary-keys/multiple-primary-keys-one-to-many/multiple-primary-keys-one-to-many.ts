import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../../../src';
import { closeTestingConnections, createTestingConnections } from '../../../../utils/test-utils';
import { User } from './entity/User';
import { Setting } from './entity/Setting';

/**
 *  Using OneToMany relation with composed primary key should not error and work correctly
 */
describe('relations > multiple-primary-keys > one-to-many', () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [User, Setting],
				schemaCreate: true,
				dropSchema: true,
			})),
	);

	after(() => closeTestingConnections(connections));

	function insertSimpleTestData(connection: DataSource) {
		const userRepo = connection.getRepository(User);
		// const settingRepo = connection.getRepository(Setting);

		const user = new User(1, 'FooGuy');
		const settingA = new Setting(1, 'A', 'foo');
		const settingB = new Setting(1, 'B', 'bar');
		user.settings = [settingA, settingB];

		return userRepo.save(user);
	}

	it('should correctly insert relation items', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userEntity = await insertSimpleTestData(connection);
				const persistedSettings = await connection.getRepository(Setting).find();

				expect(persistedSettings!).not.to.be.undefined;
				expect(persistedSettings.length).to.equal(2);
				expect(persistedSettings[0].assetId).to.equal(userEntity.id);
				expect(persistedSettings[1].assetId).to.equal(userEntity.id);
			}),
		));

	it('should correctly load relation items', () =>
		Promise.all(
			connections.map(async (connection) => {
				await insertSimpleTestData(connection);

				const [user] = await connection.getRepository(User).find({
					relations: { settings: true },
					// relationLoadStrategy: "join"
				});

				expect(user!).not.to.be.undefined;
				expect(user!.settings).to.be.an('array');
				expect(user!.settings!.length).to.equal(2);
			}),
		));

	it('should correctly update relation items', () =>
		Promise.all(
			connections.map(async (connection) => {
				await insertSimpleTestData(connection);
				const userRepo = connection.getRepository(User);

				await userRepo.save([
					{
						id: 1,
						settings: [
							{ id: 1, name: 'A', value: 'foobar' },
							{ id: 1, name: 'B', value: 'testvalue' },
						],
					},
				]);

				const [user] = await connection.getRepository(User).find({ relations: { settings: true } });

				// check the saved items have correctly updated value
				expect(user!).not.to.be.undefined;
				expect(user!.settings).to.be.an('array');
				expect(user!.settings!.length).to.equal(2);
				user!.settings.forEach((setting) => {
					if (setting.name === 'A') expect(setting.value).to.equal('foobar');
					else expect(setting.value).to.equal('testvalue');
				});

				// make sure only 2 entries are in db, initial ones should have been updated
				const settings = await connection.getRepository(Setting).find();
				expect(settings).to.be.an('array');
				expect(settings!.length).to.equal(2);
			}),
		));

	it('should correctly delete relation items', () =>
		Promise.all(
			connections.map(async (connection) => {
				await insertSimpleTestData(connection);
				const userRepo = connection.getRepository(User);

				await userRepo.save({
					id: 1,
					settings: [],
				});

				const [user] = await connection.getRepository(User).find({
					relations: { settings: true },
				});

				// check that no relational items are found
				expect(user!).not.to.be.null;
				expect(user!.settings).to.be.an('array');
				expect(user!.settings!.length).to.equal(0);

				// check there are no orphane relational items
				const settings = await connection.getRepository(Setting).find();
				expect(settings).to.be.an('array');
				expect(settings!.length).to.equal(0);
			}),
		));
});
