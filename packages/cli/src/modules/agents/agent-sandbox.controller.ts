import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentSandboxRuntimeService } from './agent-sandbox-runtime.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentSandboxController {
	constructor(
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly logger: Logger,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
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

	private assertKnowledgeBaseEnabled() {
		if (!this.agentSandboxRuntimeService.isEnabled()) {
			throw new NotFoundError('Agent knowledge base is not enabled');
		}
	}

	private async warmKnowledgeSandboxInBackground(
		projectId: string,
		agentId: string,
	): Promise<void> {
		try {
			await this.agentKnowledgeService.warmKnowledgeSandbox(agentId, projectId);
		} catch (error) {
			this.logger.warn('Failed to warm agent knowledge sandbox', {
				projectId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
