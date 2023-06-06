import { Not } from 'typeorm';
import * as Db from '@/Db';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { User } from '@db/entities/User';
import { ROLES } from '@/constants';
import { BaseCommand } from '../BaseCommand';

const defaultUserProps = {
	firstName: null,
	lastName: null,
	email: null,
	password: null,
	resetPasswordToken: null,
};

export class Reset extends BaseCommand {
	static description = 'Resets the database to the default user state';

	static examples = ['$ n8n user-management:reset'];

	async run(): Promise<void> {
		const owner = await this.getInstanceOwner();

		await Db.collections.SharedWorkflow.update(
			{ userId: Not(owner.id), role: ROLES.WORKFLOW_OWNER },
			{ user: owner },
		);

		await Db.collections.SharedCredentials.update(
			{ userId: Not(owner.id), role: ROLES.CREDENTIAL_OWNER },
			{ user: owner },
		);

		await Db.collections.User.delete({ id: Not(owner.id) });
		await Db.collections.User.save(Object.assign(owner, defaultUserProps));

		const danglingCredentials: CredentialsEntity[] =
			await Db.collections.Credentials.createQueryBuilder('credentials')
				.leftJoinAndSelect('credentials.shared', 'shared')
				.where('shared.credentialsId is null')
				.getMany();
		const newSharedCredentials = danglingCredentials.map((credentials) =>
			Db.collections.SharedCredentials.create({
				credentials,
				user: owner,
				role: ROLES.CREDENTIAL_OWNER,
			}),
		);
		await Db.collections.SharedCredentials.save(newSharedCredentials);

		await Db.collections.Settings.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: 'false' },
		);
		await Db.collections.Settings.update(
			{ key: 'userManagement.skipInstanceOwnerSetup' },
			{ value: 'false' },
		);

		this.logger.info('Successfully reset the database to default user state.');
	}

	async getInstanceOwner(): Promise<User> {
		const owner = await Db.collections.User.findOneBy({ role: ROLES.GLOBAL_OWNER });

		if (owner) return owner;

		const user = new User();

		Object.assign(user, { ...defaultUserProps, role: ROLES.GLOBAL_OWNER });

		return Db.collections.User.save(user);
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		this.exit(1);
	}
}
