import { Container } from 'typedi';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { User } from '@db/entities/User';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { RoleService } from '@/services/role.service';
import { BaseCommand } from '../BaseCommand';

const defaultUserProps = {
	firstName: null,
	lastName: null,
	email: null,
	password: null,
};

export class Reset extends BaseCommand {
	static description = 'Resets the database to the default user state';

	static examples = ['$ n8n user-management:reset'];

	async run(): Promise<void> {
		const owner = await this.getInstanceOwner();

		const workflowOwnerRole = await Container.get(RoleService).findWorkflowOwnerRole();
		const credentialOwnerRole = await Container.get(RoleService).findCredentialOwnerRole();

		await Container.get(SharedWorkflowRepository).makeOwnerOfAllWorkflows(owner, workflowOwnerRole);
		await Container.get(SharedCredentialsRepository).makeOwnerOfAllCredentials(
			owner,
			credentialOwnerRole,
		);

		await Container.get(UserRepository).deleteAllExcept(owner);
		await Container.get(UserRepository).save(Object.assign(owner, defaultUserProps));

		const danglingCredentials: CredentialsEntity[] = await Container.get(CredentialsRepository)
			.createQueryBuilder('credentials')
			.leftJoinAndSelect('credentials.shared', 'shared')
			.where('shared.credentialsId is null')
			.getMany();
		const newSharedCredentials = danglingCredentials.map((credentials) =>
			Container.get(SharedCredentialsRepository).create({
				credentials,
				user: owner,
				role: credentialOwnerRole,
			}),
		);
		await Container.get(SharedCredentialsRepository).save(newSharedCredentials);

		await Container.get(SettingsRepository).update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: 'false' },
		);

		this.logger.info('Successfully reset the database to default user state.');
	}

	async getInstanceOwner(): Promise<User> {
		const globalRole = await Container.get(RoleService).findGlobalOwnerRole();

		const owner = await Container.get(UserRepository).findOneBy({ globalRoleId: globalRole.id });

		if (owner) return owner;

		const user = new User();

		Object.assign(user, { ...defaultUserProps, globalRole });

		await Container.get(UserRepository).save(user);

		return await Container.get(UserRepository).findOneByOrFail({ globalRoleId: globalRole.id });
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		this.exit(1);
	}
}
