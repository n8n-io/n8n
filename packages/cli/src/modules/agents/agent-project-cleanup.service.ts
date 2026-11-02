import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentTestChatService } from './agent-test-chat.service';
import { AgentRepository } from './repositories/agent.repository';

/** Remove external and memory data before the project cascade removes their references. */
@Service()
export class AgentProjectCleanupService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly agentChatAttachmentService: AgentChatAttachmentService,
		private readonly agentTestChatService: AgentTestChatService,
		private readonly logger: Logger,
	) {}

	async cleanupProject(projectId: string): Promise<void> {
		const {
			agentRepository,
			agentKnowledgeService,
			agentExecutionService,
			agentChatAttachmentService,
			agentTestChatService,
		} = this;
		const agents = await agentRepository.findByProjectId(projectId);
		for (const agent of agents) {
			try {
				await agentKnowledgeService.deleteAllFilesForAgent(projectId, agent.id);
			} catch (error) {
				this.logger.warn('Failed to delete knowledge files on project delete', {
					agentId: agent.id,
					projectId,
					error: error instanceof Error ? error.message : error,
				});
			}

			// Delete chat attachment bytes before the project removal cascades away
			// the agent_chat_attachments rows that hold the binaryDataId handles.
			try {
				await agentChatAttachmentService.deleteByAgent(agent.id);
			} catch (error) {
				this.logger.warn('Failed to delete chat attachments on project delete', {
					agentId: agent.id,
					projectId,
					error: error instanceof Error ? error.message : error,
				});
			}

			await agentKnowledgeService.destroyKnowledgeSandbox(projectId, agent.id);
			await agentTestChatService.clearAllTestChatMessages(agent.id);
		}
		await agentExecutionService.deleteExecutionLogsForProject(projectId);
		await agentExecutionService.deleteMemoryThreadsForProject(projectId);
		await agentChatAttachmentService.deleteByProject(projectId);
	}
}
