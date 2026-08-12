import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentTestChatService, chatThreadId } from '../agent-test-chat.service';
import type { N8nHarnessSessionCleanupService } from '../integrations/n8n-harness-session-cleanup.service';
import type { N8nMemory } from '../integrations/n8n-memory';

const agentId = 'agent-1';
const userId = 'user-1';
type MemoryImplementation = ReturnType<N8nMemory['getImplementation']>;

function makeService() {
	const n8nMemory = mock<N8nMemory>();
	const memory = mock<MemoryImplementation>();
	const attachmentService = mock<AgentChatAttachmentService>();
	const harnessSessionCleanupService = mock<N8nHarnessSessionCleanupService>();
	n8nMemory.getImplementation.mockReturnValue(memory);

	return {
		service: new AgentTestChatService(n8nMemory, attachmentService, harnessSessionCleanupService),
		n8nMemory,
		memory,
		attachmentService,
		harnessSessionCleanupService,
	};
}

describe('AgentTestChatService', () => {
	it('derives stable agent and user-scoped test-chat thread ids', () => {
		expect(chatThreadId(agentId)).toBe(`test-${agentId}`);
		expect(chatThreadId(agentId, userId)).toBe(`test-${agentId}:${userId}`);
	});

	it('loads messages from the user-scoped thread and memory resource', async () => {
		const { service, memory } = makeService();
		const messages = [{ id: 'message-1' }];
		memory.getMessages.mockResolvedValue(messages as never);

		await expect(service.getTestChatMessages(agentId, userId)).resolves.toBe(messages);
		expect(memory.getMessages).toHaveBeenCalledWith(`test-${agentId}:${userId}`, {
			resourceId: `draft-chat:${userId}`,
		});
	});

	it('clears one user thread or every test-chat thread for an agent', async () => {
		const { service, memory, harnessSessionCleanupService } = makeService();

		await service.clearTestChatMessages(agentId, userId);
		expect(memory.deleteThread).toHaveBeenCalledWith(`test-${agentId}:${userId}`);
		expect(harnessSessionCleanupService.destroyByAgentAndThread).toHaveBeenCalledWith(
			agentId,
			`test-${agentId}:${userId}`,
		);

		await service.clearAllTestChatMessages(agentId);
		expect(memory.deleteThreadsByPrefix).toHaveBeenCalledWith(`test-${agentId}`);
		expect(memory.deleteMessagesByThread).toHaveBeenCalledWith(`test-${agentId}`);
		expect(memory.deleteThread).toHaveBeenCalledWith(`test-${agentId}`);
		expect(harnessSessionCleanupService.destroyByAgentAndThreadPrefix).toHaveBeenCalledWith(
			agentId,
			`test-${agentId}`,
		);
	});
});
