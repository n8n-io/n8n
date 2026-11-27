import { mock } from 'vitest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import { AgentProjectCleanupService } from '../agent-project-cleanup.service';
import type { AgentServiceAccountService } from '../agent-service-account.service';
import type { AgentSessionStopService } from '../agent-session-stop.service';
import type { AgentTestChatService } from '../agent-test-chat.service';
import type { AgentApprovalCleanupService } from '../approval/agent-approval-cleanup.service';
import type { ProjectAgent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import type { AgentProjectDeletionRepository } from '../repositories/agent-project-deletion.repository';

describe('AgentProjectCleanupService', () => {
	const agents = mock<AgentRepository>();
	const knowledge = mock<AgentKnowledgeService>();
	const executionService = mock<AgentExecutionService>();
	const attachments = mock<AgentChatAttachmentService>();
	const testChat = mock<AgentTestChatService>();
	const deletion = mock<AgentProjectDeletionRepository>();
	const sessions = mock<AgentSessionStopService>();
	const executions = mock<AgentExecutionRepository>();
	const agentServiceAccount = mock<AgentServiceAccountService>();
	const approvalCleanup = mock<AgentApprovalCleanupService>();
	const actor = mock<User>({ id: 'actor-1' });
	const service = new AgentProjectCleanupService(
		agents,
		knowledge,
		executionService,
		attachments,
		testChat,
		mock<Logger>(),
		deletion,
		sessions,
		executions,
		agentServiceAccount,
		approvalCleanup,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		agents.findByProjectId.mockResolvedValue([]);
		executions.hasRunningForProject.mockResolvedValue(false);
		// The real service runs the cleanup inside this call, after the work of the account moved.
		agentServiceAccount.deleteForAgent.mockImplementation(
			async (_agent, _actor, _transferId, _ctx, cleanUp) => await cleanUp(),
		);
	});
	afterEach(() => vi.useRealTimers());

	it('fences writes and drains active turns before removing data', async () => {
		vi.useFakeTimers();
		executions.hasRunningForProject.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		const cleanup = service.cleanupProject('project-1', { actor });
		await vi.advanceTimersByTimeAsync(0);
		expect(agents.findByProjectId).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(100);
		await cleanup;
		expect(deletion.beginDeletion.mock.invocationCallOrder[0]).toBeLessThan(
			sessions.stopProjectSessions.mock.invocationCallOrder[0],
		);
		expect(sessions.stopProjectSessions.mock.invocationCallOrder[0]).toBeLessThan(
			agents.findByProjectId.mock.invocationCallOrder[0],
		);
		expect(executionService.deleteMemoryThreadsForProject).toHaveBeenCalledWith('project-1');
		expect(attachments.deleteByProject).toHaveBeenCalledWith('project-1');
		expect(attachments.deleteByAgent).not.toHaveBeenCalled();
	});

	it('leaves all data in place if sessions cannot stop', async () => {
		vi.useFakeTimers();
		executions.hasRunningForProject.mockResolvedValue(true);
		const result = expect(service.cleanupProject('project-1', { actor })).rejects.toThrow(
			'Retry project deletion',
		);
		await vi.advanceTimersByTimeAsync(60_000);
		await result;
		expect(agents.findByProjectId).not.toHaveBeenCalled();
		expect(executionService.deleteExecutionLogsForAgent).not.toHaveBeenCalled();
		expect(executionService.deleteMemoryThreadsForProject).not.toHaveBeenCalled();
	});

	it('does not allow the project cascade when attachment storage fails', async () => {
		attachments.deleteByProject.mockRejectedValue(new Error('storage unavailable'));
		await expect(service.cleanupProject('project-1', { actor })).rejects.toThrow(
			'storage unavailable',
		);
	});

	it('removes the service account of each agent with the transfer target', async () => {
		const first = mock<ProjectAgent>({ id: 'agent-1', identityId: 'sa-1' });
		const second = mock<ProjectAgent>({ id: 'agent-2', identityId: 'sa-2' });
		agents.findByProjectId.mockResolvedValue([first, second]);

		const ctx = { security: mock<SecurityContext>({ subIdentityId: 'login-1' }) };

		await service.cleanupProject('project-1', { actor, transferId: 'target-1', ctx });

		expect(agentServiceAccount.deleteForAgent).toHaveBeenCalledTimes(2);
		for (const agent of [first, second]) {
			expect(agentServiceAccount.deleteForAgent).toHaveBeenCalledWith(
				agent,
				actor,
				'target-1',
				ctx,
				expect.any(Function),
				{ source: 'project-deletion' },
			);
			expect(executionService.deleteExecutionLogsForAgent).toHaveBeenCalledWith(agent.id);
		}
	});

	it('cleans up approvals of each agent with its private owner', async () => {
		const first = mock<ProjectAgent>({ id: 'agent-1', approvalWorkflowId: 'owner-1' });
		const second = mock<ProjectAgent>({ id: 'agent-2', approvalWorkflowId: null });
		agents.findByProjectId.mockResolvedValue([first, second]);

		await service.cleanupProject('project-1', { actor });

		expect(approvalCleanup.cleanupAgent).toHaveBeenCalledTimes(2);
		expect(approvalCleanup.cleanupAgent).toHaveBeenCalledWith('agent-1', 'project-1', 'owner-1');
		expect(approvalCleanup.cleanupAgent).toHaveBeenCalledWith('agent-2', 'project-1', null);
		expect(approvalCleanup.cleanupAgent.mock.invocationCallOrder[0]).toBeGreaterThan(
			agentServiceAccount.deleteForAgent.mock.invocationCallOrder[0],
		);
	});

	it('checks approval blockers of every agent before it removes any account', async () => {
		agents.findByProjectId.mockResolvedValue([
			mock<ProjectAgent>({ id: 'agent-1', identityId: 'sa-1' }),
			mock<ProjectAgent>({ id: 'agent-2', identityId: 'sa-2' }),
		]);
		approvalCleanup.assertCanCleanupAgent
			.mockResolvedValueOnce()
			.mockRejectedValueOnce(new Error('still stopping'));

		await expect(service.cleanupProject('project-1', { actor })).rejects.toThrow('still stopping');
		expect(approvalCleanup.assertCanCleanupAgent).toHaveBeenCalledWith('agent-2');
		expect(approvalCleanup.cleanupAgent).not.toHaveBeenCalled();
		expect(agentServiceAccount.deleteForAgent).not.toHaveBeenCalled();
	});

	it('keeps knowledge and chat when an approval blocks cleanup', async () => {
		agents.findByProjectId.mockResolvedValue([
			mock<ProjectAgent>({ id: 'agent-1', identityId: 'sa-1' }),
		]);
		approvalCleanup.cleanupAgent.mockRejectedValue(new Error('approval resumed'));

		await expect(service.cleanupProject('project-1', { actor })).rejects.toThrow(
			'approval resumed',
		);

		expect(knowledge.deleteAllFilesForAgent).not.toHaveBeenCalled();
		expect(knowledge.destroyKnowledgeSandbox).not.toHaveBeenCalled();
		expect(testChat.clearAllTestChatMessages).not.toHaveBeenCalled();
		expect(executionService.deleteExecutionLogsForAgent).not.toHaveBeenCalled();
	});

	it('stops the project deletion when a service account cannot be removed', async () => {
		agents.findByProjectId.mockResolvedValue([
			mock<ProjectAgent>({ id: 'agent-1', identityId: 'sa-1' }),
		]);
		agentServiceAccount.deleteForAgent.mockRejectedValue(new Error('transfer blocked'));

		await expect(service.cleanupProject('project-1', { actor })).rejects.toThrow(
			'transfer blocked',
		);
		expect(approvalCleanup.cleanupAgent).not.toHaveBeenCalled();
		expect(knowledge.deleteAllFilesForAgent).not.toHaveBeenCalled();
		expect(testChat.clearAllTestChatMessages).not.toHaveBeenCalled();
		expect(executionService.deleteExecutionLogsForAgent).not.toHaveBeenCalled();
		expect(executionService.deleteMemoryThreadsForProject).not.toHaveBeenCalled();
	});
});
