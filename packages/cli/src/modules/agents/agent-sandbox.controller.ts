import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentKnowledgeService } from './agent-knowledge.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentSandboxController {
	constructor(
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly logger: Logger,
	) {}

	@Post('/:agentId/sandbox/knowledge/warmup')
	@ProjectScope('agent:execute')
	async warmKnowledgeSandbox(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
	): Promise<{ accepted: true }> {
		res.status(202);
		setImmediate(() => {
			void this.warmKnowledgeSandboxInBackground(projectId, agentId, req.user.id);
		});

		return { accepted: true };
	}

	private async warmKnowledgeSandboxInBackground(
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<void> {
		try {
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
