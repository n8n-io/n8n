import type { WhatsAppCredentialCheck, WhatsAppWebhookStatus } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { WhatsAppCredentialCheckService } from './integrations/platforms/whatsapp-credential-check.service';
import { WhatsAppWebhookVerificationStore } from './integrations/platforms/whatsapp-webhook-verification.store';
import { AgentRepository } from './repositories/agent.repository';

@RestController('/projects/:projectId/agents/v2')
export class AgentWhatsAppIntegrationsController {
	constructor(
		private readonly credentialCheckService: WhatsAppCredentialCheckService,
		private readonly webhookVerification: WhatsAppWebhookVerificationStore,
		private readonly agentRepository: AgentRepository,
	) {}

	/**
	 * Proves the credential works with Meta before the channel is connected, and
	 * returns the business profile that customers see.
	 */
	@Post('/:agentId/integrations/whatsapp/check/:credentialId')
	@ProjectScope('agent:update')
	async checkCredential(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('credentialId') credentialId: string,
	): Promise<WhatsAppCredentialCheck> {
		return await this.credentialCheckService.check(req.user, req.params.projectId, credentialId);
	}

	/** Polled by the setup until Meta completes the webhook handshake. */
	@Get('/:agentId/integrations/whatsapp/webhook-status')
	@ProjectScope('agent:read')
	async webhookStatus(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<WhatsAppWebhookStatus> {
		// Polled, so it checks the agent exists without loading its config.
		const exists = await this.agentRepository.existsBy({
			id: agentId,
			projectId: req.params.projectId,
		});
		if (!exists) throw new NotFoundError(`Agent "${agentId}" not found`);
		return { verified: await this.webhookVerification.isVerified(agentId) };
	}
}
