'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.Reset = void 0;
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const n8n_workflow_1 = require('n8n-workflow');
const zod_1 = require('zod');
const constants_2 = require('@/constants');
const credentials_service_1 = require('@/credentials/credentials.service');
const workflow_service_1 = require('@/workflows/workflow.service');
const base_command_1 = require('../base-command');
const wrongFlagsError =
	'You must use exactly one of `--userId`, `--projectId` or `--deleteWorkflowsAndCredentials`.';
const flagsSchema = zod_1.z.object({
	userId: zod_1.z
		.string()
		.describe(
			'The ID of the user to assign the workflows and credentials owned by the deleted LDAP users to',
		)
		.optional(),
	projectId: zod_1.z
		.string()
		.describe(
			'The ID of the project to assign the workflows and credentials owned by the deleted LDAP users to',
		)
		.optional(),
	deleteWorkflowsAndCredentials: zod_1.z
		.boolean()
		.describe(
			'Delete all workflows and credentials owned by the users that were created by the users managed via LDAP.',
		)
		.optional(),
});
let Reset = class Reset extends base_command_1.BaseCommand {
	async run() {
		const { flags } = this;
		const numberOfOptions =
			Number(!!flags.userId) +
			Number(!!flags.projectId) +
			Number(!!flags.deleteWorkflowsAndCredentials);
		if (numberOfOptions !== 1) {
			throw new n8n_workflow_1.UserError(wrongFlagsError);
		}
		const owner = await this.getOwner();
		const ldapIdentities = await di_1.Container.get(db_1.AuthIdentityRepository).find({
			where: { providerType: 'ldap' },
			select: ['userId'],
		});
		const personalProjectIds = await di_1.Container.get(
			db_1.ProjectRelationRepository,
		).getPersonalProjectsForUsers(ldapIdentities.map((i) => i.userId));
		if (flags.projectId ?? flags.userId) {
			if (flags.userId && ldapIdentities.some((i) => i.userId === flags.userId)) {
				throw new n8n_workflow_1.UserError(
					`Can't migrate workflows and credentials to the user with the ID ${flags.userId}. That user was created via LDAP and will be deleted as well.`,
				);
			}
			if (flags.projectId && personalProjectIds.includes(flags.projectId)) {
				throw new n8n_workflow_1.UserError(
					`Can't migrate workflows and credentials to the project with the ID ${flags.projectId}. That project is a personal project belonging to a user that was created via LDAP and will be deleted as well.`,
				);
			}
			const project = await this.getProject(flags.userId, flags.projectId);
			await di_1.Container.get(db_1.UserRepository).manager.transaction(async (trx) => {
				for (const projectId of personalProjectIds) {
					await di_1.Container.get(workflow_service_1.WorkflowService).transferAll(
						projectId,
						project.id,
						trx,
					);
					await di_1.Container.get(credentials_service_1.CredentialsService).transferAll(
						projectId,
						project.id,
						trx,
					);
				}
			});
		}
		const [ownedSharedWorkflows, ownedSharedCredentials] = await Promise.all([
			di_1.Container.get(db_1.SharedWorkflowRepository).find({
				select: { workflowId: true },
				where: { projectId: (0, typeorm_1.In)(personalProjectIds), role: 'workflow:owner' },
			}),
			di_1.Container.get(db_1.SharedCredentialsRepository).find({
				relations: { credentials: true },
				where: { projectId: (0, typeorm_1.In)(personalProjectIds), role: 'credential:owner' },
			}),
		]);
		const ownedCredentials = ownedSharedCredentials.map(({ credentials }) => credentials);
		for (const { workflowId } of ownedSharedWorkflows) {
			await di_1.Container.get(workflow_service_1.WorkflowService).delete(owner, workflowId, true);
		}
		for (const credential of ownedCredentials) {
			await di_1.Container.get(credentials_service_1.CredentialsService).delete(
				owner,
				credential.id,
			);
		}
		await di_1.Container.get(db_1.AuthProviderSyncHistoryRepository).delete({
			providerType: 'ldap',
		});
		await di_1.Container.get(db_1.AuthIdentityRepository).delete({ providerType: 'ldap' });
		await di_1.Container.get(db_1.UserRepository).deleteMany(ldapIdentities.map((i) => i.userId));
		await di_1.Container.get(db_1.ProjectRepository).delete({
			id: (0, typeorm_1.In)(personalProjectIds),
		});
		await di_1.Container.get(db_1.SettingsRepository).delete({
			key: constants_1.LDAP_FEATURE_NAME,
		});
		await di_1.Container.get(db_1.SettingsRepository).insert({
			key: constants_1.LDAP_FEATURE_NAME,
			value: JSON.stringify(constants_1.LDAP_DEFAULT_CONFIGURATION),
			loadOnStartup: true,
		});
		this.logger.info('Successfully reset the database to default ldap state.');
	}
	async getProject(userId, projectId) {
		if (projectId) {
			const project = await di_1.Container.get(db_1.ProjectRepository).findOneBy({ id: projectId });
			if (project === null) {
				throw new n8n_workflow_1.UserError(`Could not find the project with the ID ${projectId}.`);
			}
			return project;
		}
		if (userId) {
			const project = await di_1.Container.get(db_1.ProjectRepository).getPersonalProjectForUser(
				userId,
			);
			if (project === null) {
				throw new n8n_workflow_1.UserError(
					`Could not find the user with the ID ${userId} or their personalProject.`,
				);
			}
			return project;
		}
		throw new n8n_workflow_1.UserError(wrongFlagsError);
	}
	async catch(error) {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
	}
	async getOwner() {
		const owner = await di_1.Container.get(db_1.UserRepository).findOneBy({ role: 'global:owner' });
		if (!owner) {
			throw new n8n_workflow_1.UserError(`Failed to find owner. ${constants_2.UM_FIX_INSTRUCTION}`);
		}
		return owner;
	}
};
exports.Reset = Reset;
exports.Reset = Reset = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'ldap:reset',
			description:
				'Resets the database to the default ldap state.\n\nTHIS DELETES ALL LDAP MANAGED USERS.',
			examples: [
				'--userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
				'--projectId=Ox8O54VQrmBrb4qL',
				'--deleteWorkflowsAndCredentials',
			],
			flagsSchema,
		}),
	],
	Reset,
);
//# sourceMappingURL=reset.js.map
