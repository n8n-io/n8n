import type { CredentialsEntity } from '@n8n/db';
import {
	User,
	CredentialsRepository,
	ProjectRepository,
	SettingsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	UserRepository,
	GLOBAL_OWNER_ROLE,
} from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { BaseCommand } from '../base-command';

const defaultUserProps = {
	firstName: null,
	lastName: null,
	email: null,
	password: null,
	role: 'global:owner',
};

@Command({
	name: 'user-management:reset',
	description: 'Resets the database to the default user state',
})
export class Reset extends BaseCommand {
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
		const owner = await Container.get(UserRepository).findOneBy({
			role: { slug: GLOBAL_OWNER_ROLE.slug },
		});

		if (owner) return owner;

		const user = new User();

		Object.assign(user, defaultUserProps);

		await Container.get(UserRepository).save(user);

		return await Container.get(UserRepository).findOneByOrFail({
			role: { slug: GLOBAL_OWNER_ROLE.slug },
		});
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		process.exit(1);
	}
}
