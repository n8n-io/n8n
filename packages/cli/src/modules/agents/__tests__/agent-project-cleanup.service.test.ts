import { mock } from 'vitest-mock-extended';
import type { Logger } from '@n8n/backend-common';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import { AgentProjectCleanupService } from '../agent-project-cleanup.service';
import type { AgentSessionStopService } from '../agent-session-stop.service';
import type { AgentTestChatService } from '../agent-test-chat.service';
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
	);

	beforeEach(() => {
		vi.resetAllMocks();
		agents.findByProjectId.mockResolvedValue([]);
		executions.hasRunningForProject.mockResolvedValue(false);
	});
	afterEach(() => vi.useRealTimers());

	it('fences writes and drains active turns before removing data', async () => {
		vi.useFakeTimers();
		executions.hasRunningForProject.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		const cleanup = service.cleanupProject('project-1');
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
		const result = expect(service.cleanupProject('project-1')).rejects.toThrow(
			'Retry project deletion',
		);
		await vi.advanceTimersByTimeAsync(60_000);
		await result;
		expect(agents.findByProjectId).not.toHaveBeenCalled();
		expect(executionService.deleteMemoryThreadsForProject).not.toHaveBeenCalled();
	});

	it('does not allow the project cascade when attachment storage fails', async () => {
		attachments.deleteByProject.mockRejectedValue(new Error('storage unavailable'));
		await expect(service.cleanupProject('project-1')).rejects.toThrow('storage unavailable');
	});
});
