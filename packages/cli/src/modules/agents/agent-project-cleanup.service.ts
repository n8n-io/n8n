import type { OperationContext } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { OperationalError } from '@n8n/errors';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentKnowledgeService } from '@/modules/knowledge/files/knowledge-file.service';
import { AgentTestChatService } from './agent-test-chat.service';
import { AgentProjectDeletionRepository } from './repositories/agent-project-deletion.repository';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentSessionStopService } from './agent-session-stop.service';
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
		private readonly deletion: AgentProjectDeletionRepository,
		private readonly sessions: AgentSessionStopService,
		private readonly executions: AgentExecutionRepository,
	) {}

	async cleanupProject(projectId: string): Promise<void> {
		await this.deletion.beginDeletion(projectId);
		await this.sessions.stopProjectSessions(projectId);
		const deadline = Date.now() + 60_000;
		while (await this.executions.hasRunningForProject(projectId)) {
			if (Date.now() >= deadline)
				throw new OperationalError('Agent sessions are still stopping. Retry project deletion.');
			await sleep(100);
		}
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

			await agentKnowledgeService.destroyKnowledgeSandbox(projectId, agent.id);
			await agentTestChatService.clearAllTestChatMessages(agent.id);
		}
		await agentExecutionService.deleteExecutionLogsForProject(projectId);
		await agentExecutionService.deleteMemoryThreadsForProject(projectId);
		await agentChatAttachmentService.deleteByProject(projectId);
	}

	async completeProjectDeletion(projectId: string, ctx: OperationContext): Promise<void> {
		await this.deletion.completeDeletion(projectId, ctx);
	}
}
