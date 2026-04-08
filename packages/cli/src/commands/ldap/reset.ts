import { LDAP_FEATURE_NAME, LDAP_DEFAULT_CONFIGURATION } from '@n8n/constants';
import {
	AuthIdentityRepository,
	AuthProviderSyncHistoryRepository,
	GLOBAL_OWNER_ROLE,
	ProjectRelationRepository,
	ProjectRepository,
	SettingsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	UserRepository,
} from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { UM_FIX_INSTRUCTION } from '@/constants';
import { CredentialsService } from '@/credentials/credentials.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { BaseCommand } from '../base-command';

const wrongFlagsError =
	'You must use exactly one of `--userId`, `--projectId` or `--deleteWorkflowsAndCredentials`.';

const flagsSchema = z.object({
	userId: z
		.string()
		.describe(
			'The ID of the user to assign the workflows and credentials owned by the deleted LDAP users to',
		)
		.optional(),
	projectId: z
		.string()
		.describe(
			'The ID of the project to assign the workflows and credentials owned by the deleted LDAP users to',
		)
		.optional(),
	deleteWorkflowsAndCredentials: z
		.boolean()
		.describe(
			'Delete all workflows and credentials owned by the users that were created by the users managed via LDAP.',
		)
		.optional(),
});

@Command({
	name: 'ldap:reset',
	description:
		'Resets the database to the default ldap state.\n\nTHIS DELETES ALL LDAP MANAGED USERS.',
	examples: [
		'--userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
		'--projectId=Ox8O54VQrmBrb4qL',
		'--deleteWorkflowsAndCredentials',
	],
	flagsSchema,
})
export class Reset extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run(): Promise<void> {
		const { flags } = this;
		const numberOfOptions =
			Number(!!flags.userId) +
			Number(!!flags.projectId) +
			Number(!!flags.deleteWorkflowsAndCredentials);

		if (numberOfOptions !== 1) {
			throw new UserError(wrongFlagsError);
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
				throw new UserError(
					`Can't migrate workflows and credentials to the user with the ID ${flags.userId}. That user was created via LDAP and will be deleted as well.`,
				);
			}

			if (flags.projectId && personalProjectIds.includes(flags.projectId)) {
				throw new UserError(
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
			await Container.get(WorkflowService).delete(owner, workflowId, true);
		}

		for (const credential of ownedCredentials) {
			await Container.get(CredentialsService).delete(owner, credential.id);
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
				throw new UserError(`Could not find the project with the ID ${projectId}.`);
			}

			return project;
		}

		if (userId) {
			const project = await Container.get(ProjectRepository).getPersonalProjectForUser(userId);

			if (project === null) {
				throw new UserError(
					`Could not find the user with the ID ${userId} or their personalProject.`,
				);
			}

			return project;
		}

		throw new UserError(wrongFlagsError);
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
	}

	private async getOwner() {
		const owner = await Container.get(UserRepository).findOne({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			relations: ['role'],
		});
		if (!owner) {
			throw new UserError(`Failed to find owner. ${UM_FIX_INSTRUCTION}`);
		}

		return owner;
	}
}
