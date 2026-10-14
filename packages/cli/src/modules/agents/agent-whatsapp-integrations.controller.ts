import type { WhatsAppCredentialCheck, WhatsAppWebhookStatus } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { WhatsAppCredentialCheckService } from './integrations/platforms/whatsapp/whatsapp-credential-check.service';
import { WhatsAppWebhookVerificationStore } from './integrations/platforms/whatsapp/whatsapp-webhook-verification.store';
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
		await this.assertAgentExists(req.params.projectId, agentId);
		return { verified: await this.webhookVerification.isVerified(agentId) };
	}

	/**
	 * Forgets an earlier handshake before the setup asks for a new one. The
	 * handshake does not say which Meta app sent it, so without this a record
	 * from a replaced credential's app would confirm the step.
	 */
	@Delete('/:agentId/integrations/whatsapp/webhook-status')
	@ProjectScope('agent:update')
	async resetWebhookStatus(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<WhatsAppWebhookStatus> {
		await this.assertAgentExists(req.params.projectId, agentId);
		await this.webhookVerification.reset(agentId);
		return { verified: false };
	}

	/** Checks the agent exists without loading its config, because the status is polled. */
	private async assertAgentExists(projectId: string, agentId: string): Promise<void> {
		const exists = await this.agentRepository.existsBy({ id: agentId, projectId });
		if (!exists) throw new NotFoundError(`Agent "${agentId}" not found`);
	}
}
