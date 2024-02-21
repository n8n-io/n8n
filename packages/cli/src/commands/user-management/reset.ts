import { Container } from 'typedi';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { BaseCommand } from '../BaseCommand';
import { ProjectRepository } from '@/databases/repositories/project.repository';

const defaultUserProps = {
	firstName: null,
	lastName: null,
	email: null,
	password: null,
	role: 'global:owner',
} as const;

export class Reset extends BaseCommand {
	static description = 'Resets the database to the default user state';

	static examples = ['$ n8n user-management:reset'];

	async run(): Promise<void> {
		const { owner, personalProject } = await this.getInstanceOwnerAndPersonalProject();

		// TODO: Instead of re-owning all workflows and credentials this should
		// instead add the owner to all projects in the database (except personal
		// projects)
		// This retains more of the structure of what was there before.
		// This is blocked by SharedCredential.userId and SharedWorkflow.userId not
		// being removed yet. So right now the cascading delete would delete all
		// workflows and credentials unless the sharings are updated too.
		await Container.get(SharedWorkflowRepository).makeOwnerOfAllWorkflows(owner);
		await Container.get(SharedCredentialsRepository).makeOwnerOfAllCredentials(owner);

		await Container.get(UserRepository).deleteAllExcept(owner);
		await Container.get(UserRepository).save(Object.assign(owner, defaultUserProps));

		const orphanedCredentials: CredentialsEntity[] = await Container.get(CredentialsRepository)
			.createQueryBuilder('credentials')
			.leftJoinAndSelect('credentials.shared', 'shared')
			.where('shared.credentialsId is null')
			.getMany();
		const newSharedCredentials = orphanedCredentials.map((credentials) =>
			Container.get(SharedCredentialsRepository).create({
				credentials,
				projectId: personalProject.id,
				role: 'credential:owner',
				// TODO: Remove this in the future when the userId property is removed
				// from the SharedWorkflow.
				deprecatedUserId: owner.id,
			}),
		);
		await Container.get(SharedCredentialsRepository).save(newSharedCredentials);

		await Container.get(SettingsRepository).update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: 'false' },
		);

		this.logger.info('Successfully reset the database to default user state.');
	}

	async getInstanceOwnerAndPersonalProject() {
		const owner = await Container.get(UserRepository).findOneBy({ role: 'global:owner' });

		if (owner) {
			const personalProject =
				(await Container.get(ProjectRepository).getPersonalProjectForUser(owner.id)) ??
				(await Container.get(ProjectRepository).createProjectForUser(owner.id));

			return { owner, personalProject };
		}

		const { user, project } = await Container.get(UserRepository).createUserWithProject({
			role: 'global:owner',
		});

		return { owner: user, personalProject: project };
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		this.exit(1);
	}
}
