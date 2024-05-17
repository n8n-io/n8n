import Container from 'typedi';
import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@/Ldap/constants';
import { AuthIdentityRepository } from '@db/repositories/authIdentity.repository';
import { AuthProviderSyncHistoryRepository } from '@db/repositories/authProviderSyncHistory.repository';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { BaseCommand } from '../BaseCommand';
import { Flags } from '@oclif/core';
import { ApplicationError } from 'n8n-workflow';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { WorkflowService } from '@/workflows/workflow.service';
import { In } from '@n8n/typeorm';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import { CredentialsService } from '@/credentials/credentials.service';
import { UM_FIX_INSTRUCTION } from '@/constants';

const wrongFlagsError =
	'You must use exactly one of `--userId`, `--projectId` or `--deleteWorkflowsAndCredentials`.';

export class Reset extends BaseCommand {
	static description =
		'\nResets the database to the default ldap state.\n\nTHIS DELETES ALL LDAP MANAGED USERS.';

	static examples = [
		'$ n8n ldap:reset --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
		'$ n8n ldap:reset --projectId=Ox8O54VQrmBrb4qL',
		'$ n8n ldap:reset --deleteWorkflowsAndCredentials',
	];

	static flags = {
		help: Flags.help({ char: 'h' }),
		userId: Flags.string({
			description:
				'The ID of the user to assign the workflows and credentials owned by the deleted LDAP users to',
		}),
		projectId: Flags.string({
			description:
				'The ID of the project to assign the workflows and credentials owned by the deleted LDAP users to',
		}),
		deleteWorkflowsAndCredentials: Flags.boolean({
			description:
				'Delete all workflows and credentials owned by the users that were created by the users managed via LDAP.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Reset);
		const numberOfOptions =
			Number(!!flags.userId) +
			Number(!!flags.projectId) +
			Number(!!flags.deleteWorkflowsAndCredentials);

		if (numberOfOptions !== 1) {
			throw new ApplicationError(wrongFlagsError);
		}

		const owner = await this.getOwner();
		const ldapIdentities = await Container.get(AuthIdentityRepository).find({
			where: { providerType: 'ldap' },
			select: ['userId'],
		});
		const personalProjectIds = await Container.get(
			ProjectRelationRepository,
		).getPersonalProjectsForUsers(ldapIdentities.map((i) => i.userId));

		// Migrate all workflows and credentials to another project.
		if (flags.projectId ?? flags.userId) {
			if (flags.userId && ldapIdentities.some((i) => i.userId === flags.userId)) {
				throw new ApplicationError(
					`Can't migrate workflows and credentials to the user with the ID ${flags.userId}. That user was created via LDAP and will be deleted as well.`,
				);
			}

			if (flags.projectId && personalProjectIds.includes(flags.projectId)) {
				throw new ApplicationError(
					`Can't migrate workflows and credentials to the project with the ID ${flags.projectId}. That project is a personal project belonging to a user that was created via LDAP and will be deleted as well.`,
				);
			}

			const project = await this.getProject(flags.userId, flags.projectId);

			await Container.get(UserRepository).manager.transaction(async (trx) => {
				for (const projectId of personalProjectIds) {
					await Container.get(WorkflowService).transferAll(projectId, project.id, trx);
					await Container.get(CredentialsService).transferAll(projectId, project.id, trx);
				}
			});
		}

		const [ownedSharedWorkflows, ownedSharedCredentials] = await Promise.all([
			Container.get(SharedWorkflowRepository).find({
				select: { workflowId: true },
				where: { projectId: In(personalProjectIds), role: 'workflow:owner' },
			}),
			Container.get(SharedCredentialsRepository).find({
				relations: { credentials: true },
				where: { projectId: In(personalProjectIds), role: 'credential:owner' },
			}),
		]);

		const ownedCredentials = ownedSharedCredentials.map(({ credentials }) => credentials);

		for (const { workflowId } of ownedSharedWorkflows) {
			await Container.get(WorkflowService).delete(owner, workflowId);
		}

		for (const credential of ownedCredentials) {
			await Container.get(CredentialsService).delete(credential);
		}

		await Container.get(AuthProviderSyncHistoryRepository).delete({ providerType: 'ldap' });
		await Container.get(AuthIdentityRepository).delete({ providerType: 'ldap' });
		await Container.get(UserRepository).deleteMany(ldapIdentities.map((i) => i.userId));
		await Container.get(ProjectRepository).delete({ id: In(personalProjectIds) });
		await Container.get(SettingsRepository).delete({ key: LDAP_FEATURE_NAME });
		await Container.get(SettingsRepository).insert({
			key: LDAP_FEATURE_NAME,
			value: JSON.stringify(LDAP_DEFAULT_CONFIGURATION),
			loadOnStartup: true,
		});

		this.logger.info('Successfully reset the database to default ldap state.');
	}

	async getProject(userId?: string, projectId?: string) {
		if (projectId) {
			const project = await Container.get(ProjectRepository).findOneBy({ id: projectId });

			if (project === null) {
				throw new ApplicationError(`Could not find the project with the ID ${projectId}.`);
			}

			return project;
		}

		if (userId) {
			const project = await Container.get(ProjectRepository).getPersonalProjectForUser(userId);

			if (project === null) {
				throw new ApplicationError(
					`Could not find the user with the ID ${userId} or their personalProject.`,
				);
			}

			return project;
		}

		throw new ApplicationError(wrongFlagsError);
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
	}

	private async getOwner() {
		const owner = await Container.get(UserRepository).findOneBy({ role: 'global:owner' });
		if (!owner) {
			throw new ApplicationError(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		return owner;
	}
}
