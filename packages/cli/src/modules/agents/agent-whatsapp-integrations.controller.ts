import type {
	WhatsAppCredentialCheck,
	WhatsAppMetaStatus,
	WhatsAppWebhookStatus,
} from '@n8n/api-types';
import { WhatsAppWebhookStatusQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Param, Post, ProjectScope, Query, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { WhatsAppCredentialCheckService } from './integrations/platforms/whatsapp/whatsapp-credential-check.service';
import { WhatsAppWebhookVerificationStore } from './integrations/platforms/whatsapp/whatsapp-webhook-verification.store';
import { AgentRepository } from './repositories/agent.repository';

/** How long Meta may take after the handshake to show the saved callback URL. */
const CALLBACK_SAVE_GRACE_MS = 30_000;

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

	/**
	 * Where Meta's review of the number, display name and business stands. The
	 * settings poll this, because Meta can take days to finish.
	 */
	@Get('/:agentId/integrations/whatsapp/meta-status/:credentialId')
	@ProjectScope('agent:read')
	async metaStatus(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('credentialId') credentialId: string,
	): Promise<WhatsAppMetaStatus> {
		await this.assertAgentExists(req.params.projectId, agentId);
		return await this.credentialCheckService.getMetaStatus(
			req.user,
			req.params.projectId,
			credentialId,
		);
	}

	/** Polled by the setup until Meta completes the webhook handshake. */
	@Get('/:agentId/integrations/whatsapp/webhook-status')
	@ProjectScope('agent:read')
	async webhookStatus(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Query query: WhatsAppWebhookStatusQueryDto,
	): Promise<WhatsAppWebhookStatus> {
		await this.assertAgentExists(req.params.projectId, agentId);
		const verifiedAt = await this.webhookVerification.verifiedAt(agentId);
		if (verifiedAt === undefined || !query.credentialId) {
			return { verified: verifiedAt !== undefined };
		}

		const callbackUrl = await this.credentialCheckService.matchCallbackUrl(
			req.user,
			req.params.projectId,
			query.credentialId,
			agentId,
		);
		// Without an answer from Meta, the handshake result stands.
		if (callbackUrl !== 'mismatch') return { verified: true, appMismatch: false };
		// Meta saves the callback URL just after the handshake. Until then, the
		// app can still hold no URL or an earlier one, so the setup keeps waiting.
		if (Date.now() - verifiedAt < CALLBACK_SAVE_GRACE_MS) return { verified: false };
		return { verified: true, appMismatch: true };
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
