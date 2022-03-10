/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import Command from '@oclif/command';
import { Not } from 'typeorm';
import { LoggerProxy } from 'n8n-workflow';
import { Db } from '../../src';
import { User } from '../../src/databases/entities/User';
import { getLogger } from '../../src/Logger';

export class Reset extends Command {
	static description = '\nResets the database to the default user state';

	private defaultUserProps = {
		firstName: null,
		lastName: null,
		email: null,
		password: null,
		resetPasswordToken: null,
	};

	async run(): Promise<void> {
		const logger = getLogger();
		LoggerProxy.init(logger);
		await Db.init();

		try {
			const owner = await this.getInstanceOwner();

			const ownerWorkflowRole = await Db.collections.Role!.findOneOrFail({
				name: 'owner',
				scope: 'workflow',
			});

			const ownerCredentialRole = await Db.collections.Role!.findOneOrFail({
				name: 'owner',
				scope: 'credential',
			});

			await Db.collections.SharedWorkflow!.update(
				{ user: { id: Not(owner.id) }, role: ownerWorkflowRole },
				{ user: owner },
			);

			await Db.collections.SharedCredentials!.update(
				{ user: { id: Not(owner.id) }, role: ownerCredentialRole },
				{ user: owner },
			);
			await Db.collections.User!.delete({ id: Not(owner.id) });
			await Db.collections.User!.save(Object.assign(owner, this.defaultUserProps));

			await Db.collections.Settings!.update(
				{ key: 'userManagement.isInstanceOwnerSetUp' },
				{ value: 'false' },
			);
			await Db.collections.Settings!.update(
				{ key: 'userManagement.skipInstanceOwnerSetup' },
				{ value: 'false' },
			);
		} catch (error) {
			console.error('Error resetting database. See log messages for details.');
			if (error instanceof Error) logger.error(error.message);
			this.exit(1);
		}

		console.info('Successfully reset the database to default user state.');
		this.exit();
	}

	private async getInstanceOwner(): Promise<User> {
		const globalRole = await Db.collections.Role!.findOneOrFail({
			name: 'owner',
			scope: 'global',
		});

		const owner = await Db.collections.User!.findOne({ globalRole });

		if (owner) return owner;

		const user = new User();

		await Db.collections.User!.save(Object.assign(user, { ...this.defaultUserProps, globalRole }));

		return Db.collections.User!.findOneOrFail({ globalRole });
	}
}
