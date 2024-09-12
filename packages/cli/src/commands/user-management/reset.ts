import { Container } from 'typedi';

import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import { User } from '@/databases/entities/user';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { UserRepository } from '@/databases/repositories/user.repository';

import { BaseCommand } from '../base-command';

const defaultUserProps = {
	firstName: null,
	lastName: null,
	email: null,
	password: null,
	role: 'global:owner',
};

export class Reset extends BaseCommand {
	static description = 'Resets the database to the default user state';

	static examples = ['$ n8n user-management:reset'];

	async run(): Promise<void> {
		const owner = await this.getInstanceOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		await Container.get(SharedWorkflowRepository).makeOwnerOfAllWorkflows(personalProject);
		await Container.get(SharedCredentialsRepository).makeOwnerOfAllCredentials(personalProject);

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
				projectId: personalProject.id,
				role: 'credential:owner',
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
		const owner = await Container.get(UserRepository).findOneBy({ role: 'global:owner' });

		if (owner) return owner;

		const user = new User();

		Object.assign(user, defaultUserProps);

		await Container.get(UserRepository).save(user);

		return await Container.get(UserRepository).findOneByOrFail({ role: 'global:owner' });
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		this.exit(1);
	}
}
