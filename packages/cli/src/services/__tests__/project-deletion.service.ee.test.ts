import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type {
	FolderRepository,
	Project,
	ProjectRelationRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { ICredentialConnectionStatusProvider } from '@/credentials/credential-connection-status-provider.interface';
import type { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import type { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { WorkflowService } from '@/workflows/workflow.service';

import { ProjectDeletionService } from '../project-deletion.service.ee';
import type { ProjectService } from '../project.service.ee';

describe('ProjectDeletionService', () => {
	const projectService = mock<ProjectService>();
	const workflowService = mock<WorkflowService>();
	const credentialsService = mock<CredentialsService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const projectRepository = mock<ProjectRepository>();
	const folderRepository = mock<FolderRepository>();
	const moduleRegistry = mock<ModuleRegistry>();
	const logger = mock<Logger>();
	const agentRepository = mock<AgentRepository>();
	const agentKnowledgeService = mock<AgentKnowledgeService>();
	const agentExecutionService = mock<AgentExecutionService>();

	const deletionService = new ProjectDeletionService(
		projectService,
		workflowService,
		credentialsService,
		sharedWorkflowRepository,
		sharedCredentialsRepository,
		projectRelationRepository,
		projectRepository,
		folderRepository,
		moduleRegistry,
		logger,
	);

	const user = { id: 'user-1', role: { scopes: [{ slug: 'project:delete' }] } } as any;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls cleanupOrphanedEntriesForUsers with member IDs after project is deleted', async () => {
		// ARRANGE
		const project = mock<Project>({ id: 'project-1', type: 'team' });
		const mockProxy = mock<ICredentialConnectionStatusProvider>();
		Object.defineProperty(deletionService, 'connectionStatusProxy', {
			configurable: true,
			get: async () => mockProxy,
		});
		projectService.getProjectWithScope.mockResolvedValueOnce(project);
		projectRepository.remove.mockResolvedValueOnce(project);
		sharedWorkflowRepository.find.mockResolvedValueOnce([]);
		sharedCredentialsRepository.find.mockResolvedValueOnce([]);
		moduleRegistry.isActive.mockReturnValue(false);
		// Two members in the project
		projectRelationRepository.findBy.mockResolvedValueOnce([
			{ userId: 'member-1' },
			{ userId: 'member-2' },
		] as never);

		// ACT
		await deletionService.deleteProject(user, project.id);

		// ASSERT — project removed first, then cleanup for former members
		expect(projectRepository.remove).toHaveBeenCalledWith(project);
		expect(mockProxy.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith(['member-1', 'member-2']);
		expect(projectRepository.remove.mock.invocationCallOrder[0]).toBeLessThan(
			mockProxy.cleanupOrphanedEntriesForUsers.mock.invocationCallOrder[0],
		);
	});

	it('skips credential cleanup when the project had no members', async () => {
		// ARRANGE
		const project = mock<Project>({ id: 'project-1', type: 'team' });
		const mockProxy = mock<ICredentialConnectionStatusProvider>();
		Object.defineProperty(deletionService, 'connectionStatusProxy', {
			configurable: true,
			get: async () => mockProxy,
		});
		projectService.getProjectWithScope.mockResolvedValueOnce(project);
		projectRepository.remove.mockResolvedValueOnce(project);
		sharedWorkflowRepository.find.mockResolvedValueOnce([]);
		sharedCredentialsRepository.find.mockResolvedValueOnce([]);
		moduleRegistry.isActive.mockReturnValue(false);
		projectRelationRepository.findBy.mockResolvedValueOnce([]);

		// ACT
		await deletionService.deleteProject(user, project.id);

		// ASSERT — no members → cleanup must not be called
		expect(projectRepository.remove).toHaveBeenCalledWith(project);
		expect(mockProxy.cleanupOrphanedEntriesForUsers).not.toHaveBeenCalled();
	});

	it('cleans agent knowledge files before project deletion cascades agent files', async () => {
		const project = mock<Project>({ id: 'project-1', type: 'team' });
		Object.defineProperty(deletionService, 'agentRepository', {
			configurable: true,
			get: async () => agentRepository,
		});
		Object.defineProperty(deletionService, 'agentKnowledgeService', {
			configurable: true,
			get: async () => agentKnowledgeService,
		});
		Object.defineProperty(deletionService, 'agentExecutionService', {
			configurable: true,
			get: async () => agentExecutionService,
		});
		projectService.getProjectWithScope.mockResolvedValueOnce(project);
		projectRepository.remove.mockResolvedValueOnce(project);
		sharedWorkflowRepository.find.mockResolvedValueOnce([]);
		sharedCredentialsRepository.find.mockResolvedValueOnce([]);
		moduleRegistry.isActive.mockImplementation((moduleName) => moduleName === 'agents');
		projectRelationRepository.findBy.mockResolvedValueOnce([]);
		agentRepository.findByProjectId.mockResolvedValueOnce([
			{ id: 'agent-1' },
			{ id: 'agent-2' },
		] as never);

		await deletionService.deleteProject(user, project.id);

		expect(agentRepository.findByProjectId).toHaveBeenCalledWith(project.id);
		expect(agentKnowledgeService.deleteAllFilesForAgent).toHaveBeenCalledWith(
			project.id,
			'agent-1',
		);
		expect(agentKnowledgeService.deleteAllFilesForAgent).toHaveBeenCalledWith(
			project.id,
			'agent-2',
		);
		expect(agentKnowledgeService.deleteAllFilesForAgent.mock.invocationCallOrder[1]).toBeLessThan(
			projectRepository.remove.mock.invocationCallOrder[0],
		);
		expect(agentKnowledgeService.destroySandbox).toHaveBeenCalledWith(project.id, 'agent-1');
		expect(agentKnowledgeService.destroySandbox).toHaveBeenCalledWith(project.id, 'agent-2');
		expect(agentExecutionService.deleteExecutionLogsForAgent).toHaveBeenCalledWith('agent-1');
		expect(agentExecutionService.deleteExecutionLogsForAgent).toHaveBeenCalledWith('agent-2');
	});

	it('destroys agent sandboxes even when knowledge file cleanup fails', async () => {
		const project = mock<Project>({ id: 'project-1', type: 'team' });
		Object.defineProperty(deletionService, 'agentRepository', {
			configurable: true,
			get: async () => agentRepository,
		});
		Object.defineProperty(deletionService, 'agentKnowledgeService', {
			configurable: true,
			get: async () => agentKnowledgeService,
		});
		Object.defineProperty(deletionService, 'agentExecutionService', {
			configurable: true,
			get: async () => agentExecutionService,
		});
		projectService.getProjectWithScope.mockResolvedValueOnce(project);
		projectRepository.remove.mockResolvedValueOnce(project);
		sharedWorkflowRepository.find.mockResolvedValueOnce([]);
		sharedCredentialsRepository.find.mockResolvedValueOnce([]);
		moduleRegistry.isActive.mockImplementation((moduleName) => moduleName === 'agents');
		projectRelationRepository.findBy.mockResolvedValueOnce([]);
		agentRepository.findByProjectId.mockResolvedValueOnce([{ id: 'agent-1' }] as never);
		agentKnowledgeService.deleteAllFilesForAgent.mockRejectedValueOnce(new Error('storage down'));

		await expect(deletionService.deleteProject(user, project.id)).resolves.toBeUndefined();

		expect(agentKnowledgeService.destroySandbox).toHaveBeenCalledWith(project.id, 'agent-1');
		expect(agentExecutionService.deleteExecutionLogsForAgent).toHaveBeenCalledWith('agent-1');
		expect(projectRepository.remove).toHaveBeenCalledWith(project);
	});
});
