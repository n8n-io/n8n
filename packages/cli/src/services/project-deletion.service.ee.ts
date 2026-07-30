import { Logger, ModuleRegistry } from '@n8n/backend-common';
import {
	type User,
	Project,
	ProjectRelationRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	FolderRepository,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowService } from '@/workflows/workflow.service';

import { ProjectNotFoundError, ProjectService } from './project.service.ee';

/**
 * Orchestrates deletion (or migration) of a team project and everything it owns.
 * Lives above ProjectService, WorkflowService and CredentialsService so the
 * cascade can call them directly without those services depending back on it.
 */
@Service()
export class ProjectDeletionService {
	constructor(
		private readonly projectService: ProjectService,
		private readonly workflowService: WorkflowService,
		private readonly credentialsService: CredentialsService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly folderRepository: FolderRepository,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly logger: Logger,
	) {}

	private get dataTableService() {
		return import('@/modules/data-table/data-table.service.js').then(({ DataTableService }) =>
			Container.get(DataTableService),
		);
	}

	private get secretsProvidersConnectionsService() {
		return import('@/modules/external-secrets.ee/secrets-providers-connections.service.ee.js').then(
			({ SecretsProvidersConnectionsService }) => Container.get(SecretsProvidersConnectionsService),
		);
	}

	private get agentRepository() {
		return import('@/modules/agents/repositories/agent.repository.js').then(({ AgentRepository }) =>
			Container.get(AgentRepository),
		);
	}

	private get agentKnowledgeService() {
		return import('@/modules/agents/agent-knowledge.service.js').then(({ AgentKnowledgeService }) =>
			Container.get(AgentKnowledgeService),
		);
	}

	private get agentExecutionService() {
		return import('@/modules/agents/agent-execution.service.js').then(({ AgentExecutionService }) =>
			Container.get(AgentExecutionService),
		);
	}

	private get connectionStatusProxy() {
		return import('@/credentials/credential-connection-status-proxy.js').then(
			({ CredentialConnectionStatusProxy }) => Container.get(CredentialConnectionStatusProxy),
		);
	}

	async deleteProject(
		user: User,
		projectId: string,
		{ migrateToProject }: { migrateToProject?: string } = {},
	) {
		if (projectId === migrateToProject) {
			throw new BadRequestError(
				'Request to delete a project failed because the project to delete and the project to migrate to are the same project',
			);
		}

		const project = await this.projectService.getProjectWithScope(user, projectId, [
			'project:delete',
		]);
		ProjectNotFoundError.isDefinedAndNotNull(project, projectId);

		let targetProject: Project | null = null;
		if (migrateToProject) {
			targetProject = await this.projectService.getProjectWithScope(user, migrateToProject, [
				'credential:create',
				'workflow:create',
				'dataTable:create',
			]);

			if (!targetProject) {
				throw new NotFoundError(
					`Could not find project to migrate to. ID: ${targetProject}. You may lack permissions to create workflow, credentials or data tables in the target project.`,
				);
			}
		}

		// 0. check if this is a team project
		if (project.type !== 'team') {
			throw new ForbiddenError(
				`Can't delete project. Project with ID "${projectId}" is not a team project.`,
			);
		}

		// 1. delete or migrate workflows owned by this project
		const ownedSharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { projectId: project.id, role: 'workflow:owner' },
		});

		if (targetProject) {
			await this.sharedWorkflowRepository.makeOwner(
				ownedSharedWorkflows.map((sw) => sw.workflowId),
				targetProject.id,
			);
		} else {
			for (const sharedWorkflow of ownedSharedWorkflows) {
				await this.workflowService.delete(user, sharedWorkflow.workflowId, true);
			}
		}

		// 2. delete credentials owned by this project
		const ownedCredentials = await this.sharedCredentialsRepository.find({
			where: { projectId: project.id, role: 'credential:owner' },
			relations: { credentials: true },
		});

		if (targetProject) {
			await this.sharedCredentialsRepository.makeOwner(
				ownedCredentials.map((sc) => sc.credentialsId),
				targetProject.id,
			);
		} else {
			for (const sharedCredential of ownedCredentials) {
				await this.credentialsService.delete(user, sharedCredential.credentials.id);
			}
		}

		// 3. Move folders over to the target project, before deleting the project else cascading will delete workflows
		if (targetProject) {
			await this.folderRepository.transferAllFoldersToProject(project.id, targetProject.id);
		}

		// 4. delete shared credentials into this project
		// Cascading deletes take care of this.

		// 5. delete shared workflows into this project
		// Cascading deletes take care of this.

		// 6. delete or migrate associated data tables
		if (this.moduleRegistry.isActive('data-table')) {
			const dataTableService = await this.dataTableService;

			if (targetProject) {
				await dataTableService.transferDataTablesByProjectId(project.id, targetProject.id);
			} else {
				await dataTableService.deleteDataTableByProjectId(project.id);
			}
		}

		// 7. delete secrets providers connections that are owned by this project
		if (this.moduleRegistry.isActive('external-secrets')) {
			const secretsProvidersConnectionsService = await this.secretsProvidersConnectionsService;
			await secretsProvidersConnectionsService.cleanupConnectionsForProjectDeletion(project.id);
		}

		// 8. delete agent knowledge files before project removal cascades delete agent_files rows.
		if (this.moduleRegistry.isActive('agents')) {
			const [agentRepository, agentKnowledgeService, agentExecutionService] = await Promise.all([
				this.agentRepository,
				this.agentKnowledgeService,
				this.agentExecutionService,
			]);
			const agents = await agentRepository.findByProjectId(project.id);
			for (const agent of agents) {
				try {
					await agentKnowledgeService.deleteAllFilesForAgent(project.id, agent.id);
				} catch (error) {
					this.logger.warn('Failed to delete knowledge files on project delete', {
						agentId: agent.id,
						projectId: project.id,
						error: error instanceof Error ? error.message : error,
					});
				}

				await agentKnowledgeService.destroySandbox(project.id, agent.id);
				await agentExecutionService.deleteExecutionLogsForAgent(agent.id);
			}
		}

		// Capture member user IDs before the project (and its relations) are removed,
		// so we can clean up orphaned per-user credential entries afterward.
		const projectMembers = await this.projectRelationRepository.findBy({ projectId: project.id });
		const memberUserIds = projectMembers.map((pr) => pr.userId);

		// 9. delete project
		await this.projectRepository.remove(project);

		// 10. delete project relations
		// Cascading deletes take care of this.

		// 11. delete orphaned per-user credential entries for former members
		if (memberUserIds.length > 0) {
			const proxy = await this.connectionStatusProxy;
			await proxy.cleanupOrphanedEntriesForUsers(memberUserIds);
		}
	}
}
