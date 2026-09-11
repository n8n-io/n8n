import type { AgentGenerateChannelKeyResponse } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { AgentUpdateBroadcaster } from './agent-update-broadcaster';
import { isOpenAiCompatibleChannelType } from './integrations/platforms/openai-compatible-chat-integration';
import { OpenAiCompatibleSetupService } from './integrations/platforms/openai-compatible-setup.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentOpenAiCompatibleIntegrationsController {
	constructor(
		private readonly setupService: OpenAiCompatibleSetupService,
		private readonly agentUpdateBroadcaster: AgentUpdateBroadcaster,
	) {}

	@Post('/:agentId/integrations/:type/generate-key')
	@ProjectScope('agent:update')
	async generateKey(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('type') type: string,
	): Promise<AgentGenerateChannelKeyResponse> {
		if (!isOpenAiCompatibleChannelType(type)) {
			throw new BadRequestError(`Unknown channel type "${type}"`);
		}

		return await this.setupService.generateKey({
			agentId,
			projectId: req.params.projectId,
			type,
			user: req.user,
			onPersisted: () =>
				this.agentUpdateBroadcaster.notify(
					{ projectId: req.params.projectId, agentId },
					req.headers?.['push-ref'],
				),
		});
	}

	@Post('/:agentId/integrations/:type/regenerate-key')
	@ProjectScope('agent:update')
	async regenerateKey(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('type') type: string,
	): Promise<AgentGenerateChannelKeyResponse> {
		if (!isOpenAiCompatibleChannelType(type)) {
			throw new BadRequestError(`Unknown channel type "${type}"`);
		}

		return await this.setupService.regenerateKey({
			agentId,
			projectId: req.params.projectId,
			type,
			user: req.user,
			onPersisted: () =>
				this.agentUpdateBroadcaster.notify(
					{ projectId: req.params.projectId, agentId },
					req.headers?.['push-ref'],
				),
		});
	}
}
