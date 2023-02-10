import { Not } from 'typeorm';
import * as Db from '@/Db';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { BaseCommand } from '../BaseCommand';

export class Reset extends BaseCommand {
	static description = '\nResets the database to the default user state';

	async run(): Promise<void> {
		const owner = await this.getInstanceOwner();

		const ownerWorkflowRole = await Db.collections.Role.findOneByOrFail({
			name: 'owner',
			scope: 'workflow',
		});

		const ownerCredentialRole = await Db.collections.Role.findOneByOrFail({
			name: 'owner',
			scope: 'credential',
		});

		await Db.collections.SharedWorkflow.update(
			{ userId: Not(owner.id), roleId: ownerWorkflowRole.id },
			{ user: owner },
		);

		await Db.collections.SharedCredentials.update(
			{ userId: Not(owner.id), roleId: ownerCredentialRole.id },
			{ user: owner },
		);

		await Db.collections.User.delete({ id: Not(owner.id) });
		await Db.collections.User.save(Object.assign(owner, this.defaultUserProps));

		const danglingCredentials: CredentialsEntity[] =
			(await Db.collections.Credentials.createQueryBuilder('credentials')
				.leftJoinAndSelect('credentials.shared', 'shared')
				.where('shared.credentialsId is null')
				.getMany()) as CredentialsEntity[];
		const newSharedCredentials = danglingCredentials.map((credentials) =>
			Db.collections.SharedCredentials.create({
				credentials,
				user: owner,
				role: ownerCredentialRole,
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

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		this.exit(1);
	}
}
