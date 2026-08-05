import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { User } from './entity/User';
import { Setting } from './entity/Setting';
import { SettingSubscriber } from './entity/SettingSubscriber';

/**
 *  Using OneToMany relation with composed primary key should not error and work correctly
 */
describe('github issues > #8221', () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [User, Setting],
				subscribers: [SettingSubscriber],
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

	// important: must not use Promise.all! parallel execution against different drivers would mess up the counter within the SettingSubscriber!

	it('afterLoad entity modifier must not make relation key matching fail', async () => {
		for (const connection of connections) {
			const userRepo = connection.getRepository(User);
			const subscriber = connection.subscribers.find(
				(s) => s instanceof SettingSubscriber,
			) as SettingSubscriber;
			if (!subscriber) throw new Error(`Subscriber not found`);

			subscriber.reset();

			await insertSimpleTestData(connection);
			subscriber.reset();

			await userRepo.save([
				{
					id: 1,
					settings: [
						{ assertId: 1, name: 'A', value: 'foobar' },
						{ assertId: 1, name: 'B', value: 'testvalue' },
					],
				},
			]);

			// we use a subscriber to count generated Subjects based on how often beforeInsert/beforeRemove/beforeUpdate has been called.
			// the save query should only update settings, so only beforeUpdate should have been called.
			// if beforeInsert/beforeUpdate has been called, this would indicate that key matching has failed.
			// the resulting state would be the same, but settings entities would be deleted and inserted instead.

			expect(subscriber.counter.deletes).to.equal(0);
			expect(subscriber.counter.inserts).to.equal(0);
			expect(subscriber.counter.updates).to.equal(2);
		}
	});
});
