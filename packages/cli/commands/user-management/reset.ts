/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import Command from '@oclif/command';
import { Not } from 'typeorm';
import { LoggerProxy } from '../../../workflow/dist/src';
import { Db } from '../../src';
import { getLogger } from '../../src/Logger';

export class Reset extends Command {
	static description = '\nResets the database to the default user state';

	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);
		await Db.init();

		try {
			const globalRole = await Db.collections.Role!.findOne({
				name: 'owner',
				scope: 'global',
			});

			const instanceOwner = await Db.collections.User!.findOneOrFail({ globalRole });

			// switch all workflows ownership to owner
			await Db.collections.SharedWorkflow!.update(
				{ user: Not(instanceOwner) },
				{ user: instanceOwner },
			);

			// switch all credentials ownership to owner
			await Db.collections.SharedCredentials!.update(
				{ user: Not(instanceOwner) },
				{ user: instanceOwner },
			);

			// delete all users from users table except owner
			await Db.collections.User!.delete({ id: Not(instanceOwner.id) });

			// reset user to being a shell
			await Db.collections.User!.save(
				Object.assign(instanceOwner, {
					firstName: 'default',
					lastName: 'default',
					email: null,
					password: null,
					resetPasswordToken: null,
				}),
			);

			// update settings table
			await Db.collections.Settings!.update({ key: 'userManagement.hasOwner' }, { value: 'false' });
		} catch (error) {
			console.error('Error resetting database. See log messages for details.');
			logger.error(error.message);
			this.exit(1);
		}

		this.exit();
	}
}
