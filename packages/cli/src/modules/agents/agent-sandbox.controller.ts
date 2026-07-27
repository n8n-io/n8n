import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AiService } from '@/services/ai.service';

import { isAgentKnowledgeBaseEnabled } from './agent-knowledge-gate';
import { AgentKnowledgeService } from './agent-knowledge.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentSandboxController {
	constructor(
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
		private readonly aiService: AiService,
	) {}

	@Post('/:agentId/sandbox/knowledge/warmup')
	@ProjectScope('agent:execute')
	async warmKnowledgeSandbox(
		_req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
	): Promise<{ accepted: true }> {
		this.assertKnowledgeBaseEnabled();
		res.status(202);
		setImmediate(() => {
			void this.warmKnowledgeSandboxInBackground(projectId, agentId);
		});

		return { accepted: true };
	}

	private isKnowledgeBaseEnabled(): boolean {
		return isAgentKnowledgeBaseEnabled(this.agentsConfig, this.aiService.isProxyEnabled());
	}

	private assertKnowledgeBaseEnabled() {
		if (!this.isKnowledgeBaseEnabled()) {
			throw new NotFoundError('Agent knowledge base is not enabled');
		}
	}

	private async warmKnowledgeSandboxInBackground(
		projectId: string,
		agentId: string,
	): Promise<void> {
		try {
			if (!this.isKnowledgeBaseEnabled()) return;
			await this.agentKnowledgeService.warmSandbox(agentId, projectId);
		} catch (error) {
			this.logger.warn('Failed to warm agent knowledge sandbox', {
				projectId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
