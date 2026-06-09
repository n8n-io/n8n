import { Tool } from '@n8n/agents/tool';
import { z } from 'zod';

import type { AgentKnowledgeSandboxService } from '../../agent-knowledge-sandbox.service';
import {
	SEARCH_KNOWLEDGE_SANDBOX_CREATED,
	SEARCH_KNOWLEDGE_SANDBOX_REUSED,
} from '../../agent-knowledge-sandbox.service';

const searchKnowledgeOutputSchema = z.enum([
	SEARCH_KNOWLEDGE_SANDBOX_CREATED,
	SEARCH_KNOWLEDGE_SANDBOX_REUSED,
]);

export function createSearchKnowledgeTool({
	projectId,
	agentId,
	sandboxService,
}: {
	projectId: string;
	agentId: string;
	sandboxService: AgentKnowledgeSandboxService;
}) {
	return new Tool('search_knowledge')
		.description('Ensures this agent knowledge base has an active Daytona sandbox.')
		.input(z.object({}))
		.output(searchKnowledgeOutputSchema)
		.handler(async () => await sandboxService.ensureSandbox(projectId, agentId));
}
