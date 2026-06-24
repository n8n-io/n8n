import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { isAgentKnowledgeBaseEnabled } from './agent-knowledge-gate';
import { AgentKnowledgeService } from './agent-knowledge.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentSandboxController {
	constructor(
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
	) {}

	@Post('/:agentId/sandbox/knowledge/warmup')
	@ProjectScope('agent:execute')
	async warmKnowledgeSandbox(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
	): Promise<{ accepted: true }> {
		this.assertKnowledgeBaseEnabled();
		res.status(202);
		setImmediate(() => {
			void this.warmKnowledgeSandboxInBackground(projectId, agentId, req.user.id);
		});

		return { accepted: true };
	}

	private assertKnowledgeBaseEnabled() {
		if (!isAgentKnowledgeBaseEnabled(this.agentsConfig)) {
			throw new NotFoundError('Agent knowledge base is not enabled');
		}
	}

	private async warmKnowledgeSandboxInBackground(
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<void> {
		try {
			if (!isAgentKnowledgeBaseEnabled(this.agentsConfig)) return;
			await this.agentKnowledgeService.warmSandbox(agentId, projectId, userId);
		} catch (error) {
			this.logger.warn('Failed to warm agent knowledge sandbox', {
				projectId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
