import { Not } from 'typeorm';
import * as Db from '@/Db';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { BaseCommand } from '../BaseCommand';

export class Reset extends BaseCommand {
	static description = '\nResets the database to the default user state';

	async run(): Promise<void> {
		const owner = await this.getInstanceOwner();

		const ownerWorkflowRole = await Db.repositories.Role.findOneOrFail('owner', 'workflow');
		const ownerCredentialRole = await Db.repositories.Role.findOneOrFail('owner', 'credential');

		await Db.collections.SharedWorkflow.update(
			{ user: { id: Not(owner.id) }, role: ownerWorkflowRole },
			{ user: owner },
		);

		await Db.collections.SharedCredentials.update(
			{ user: { id: Not(owner.id) }, role: ownerCredentialRole },
			{ user: owner },
		);

		await Db.repositories.User.resetUsers(owner);

		const danglingCredentials = await Db.repositories.Credentials.findDangling();
		const newSharedCredentials = danglingCredentials.map((credentials) =>
			Db.collections.SharedCredentials.create({
				credentials,
				user: owner,
				role: ownerCredentialRole,
			}),
		);
		await Db.collections.SharedCredentials.save(newSharedCredentials);

		await Db.repositories.Settings.update('userManagement.isInstanceOwnerSetUp', 'false');
		await Db.repositories.Settings.update('userManagement.skipInstanceOwnerSetup', 'false');

		this.logger.info('Successfully reset the database to default user state.');
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		this.exit(1);
	}
}
