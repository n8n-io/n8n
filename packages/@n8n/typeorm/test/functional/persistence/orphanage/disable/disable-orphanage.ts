import 'reflect-metadata';
import { Connection, Repository } from '../../../../../src/index';
import {
	reloadTestingDatabases,
	createTestingConnections,
	closeTestingConnections,
} from '../../../../utils/test-utils';
import { expect } from 'chai';
import { User } from './entity/User';
import { Setting } from './entity/Setting';

describe('persistence > orphanage > disable', () => {
	// -------------------------------------------------------------------------
	// Configuration
	// -------------------------------------------------------------------------

	// connect to db
	let connections: Connection[] = [];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// -------------------------------------------------------------------------
	// Specifications
	// -------------------------------------------------------------------------

	describe('when a User is updated without all settings being loaded...', () => {
		let userRepo: Repository<User>;
		let settingRepo: Repository<Setting>;
		let userId: number;

		beforeEach(async function () {
			if (connections.length === 0) {
				this.skip();
			}

			await Promise.all(
				connections.map(async (connection) => {
					userRepo = connection.getRepository(User);
					settingRepo = connection.getRepository(Setting);
				}),
			);

			const user = await userRepo.save(new User());
			user.settings = [new Setting('foo'), new Setting('bar'), new Setting('moo')];

			await userRepo.save(user);
			userId = user.id;

			const userToUpdate = (await userRepo.findOneBy({ id: userId }))!;
			userToUpdate.settings = [
				// untouched setting
				userToUpdate.settings[0],
				// updated setting
				{ ...userToUpdate.settings[1], data: 'bar_updated' },
				// skipped setting
				// new Setting("moo"),
				// new setting
				new Setting('cow'),
			];

			await userRepo.save(userToUpdate);
		});

		it('should not delete setting with orphanedRowAction=disabed', async () => {
			const user = await userRepo.findOneBy({ id: userId });
			expect(user).not.to.be.undefined;
			expect(user!.settings).to.have.lengthOf(4);
		});

		it('should not orphane any Settings', async () => {
			const itemsWithoutForeignKeys = (await settingRepo.find()).filter((p) => !p.userId);
			expect(itemsWithoutForeignKeys).to.have.lengthOf(0);
		});
	});
});
