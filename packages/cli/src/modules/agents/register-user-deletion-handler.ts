import { OwnershipTransferHandlerRegistry } from '@n8n/backend-services';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentProjectCleanupService } from './agent-project-cleanup.service';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentMemoryEntryRepository } from './repositories/agent-memory-entry.repository';
import { SystemAgentExecutionService } from './system-agents/system-agent-execution.service';
import {
	draftChatMemoryResourceId,
	productionChatMemoryResourceId,
	systemChatMemoryResourceId,
} from './utils/agent-memory-scope';

/** Remove personal-project data. Keep session evidence in surviving projects. */
export function registerUserDeletionHandler() {
	Container.get(OwnershipTransferHandlerRegistry).register({
		resource: 'agent-user-memory',
		transferAll: async () => {},
		deleteAll: async () => {},
		deleteAllForUser: async (userId) => {
			const systemAgents = Container.get(SystemAgentExecutionService);
			await systemAgents.stopThreadsOfUser(userId);
			await systemAgents.deleteThreadsOfUser(userId);
			await Container.get(AgentMemoryEntryRepository).retireUserScopes(
				[
					draftChatMemoryResourceId(userId),
					productionChatMemoryResourceId(userId),
					systemChatMemoryResourceId(userId),
				],
				{},
			);
			const project =
				await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(userId);
			const threads = Container.get(AgentExecutionThreadRepository);
			await Container.get(AgentProjectCleanupService).cleanupProject(project.id);
			await threads.shareUserSessionHistory(userId);
		},
	});
}
