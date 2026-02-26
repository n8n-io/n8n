import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Request } from 'express';
import type { ICredentialContext } from 'n8n-workflow';
import { toExecutionContextEstablishmentHookParameter } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

import { verifySlackSignature } from './slack-signature-verification';

/**
 * Handles Slack-based authentication for dynamic credential endpoints.
 *
 * Verifies incoming Slack requests (slash commands, interactions) by:
 * 1. Looking up the signing secret from the workflow's webhook trigger hook config
 * 2. Verifying the HMAC-SHA256 signature
 * 3. Extracting the Slack user_id as the credential identity
 */
@Service()
export class SlackAuthService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly logger: Logger,
	) {}

	async buildSlackCredentialContext(req: Request, workflowId: string): Promise<ICredentialContext> {
		const signingSecret = await this.getSigningSecret(workflowId);

		const timestamp = this.getHeaderValue(req, 'x-slack-request-timestamp');
		if (!timestamp) {
			throw new UnauthenticatedError('Missing x-slack-request-timestamp header');
		}

		const signature = this.getHeaderValue(req, 'x-slack-signature');
		if (!signature) {
			throw new UnauthenticatedError('Missing x-slack-signature header');
		}

		const body = req.body as Record<string, unknown> | undefined;
		if (!body || typeof body !== 'object') {
			throw new BadRequestError('Request body is required for Slack authentication');
		}

		verifySlackSignature(signingSecret, timestamp, body, signature);

		const userId = body['user_id'];
		if (typeof userId !== 'string' || userId.length === 0) {
			throw new UnauthenticatedError('Missing user_id in Slack request body');
		}

		const teamId = typeof body['team_id'] === 'string' ? body['team_id'] : undefined;

		this.logger.debug('Slack request authenticated via authSource=slack', {
			userId,
			teamId,
			workflowId,
		});

		return {
			identity: userId,
			version: 1,
			metadata: {
				source: 'slack-request',
				...(teamId ? { teamId } : {}),
			},
		};
	}

	/**
	 * Retrieves the Slack signing secret from the workflow's webhook trigger node
	 * hook configuration (contextEstablishmentHooks).
	 */
	private async getSigningSecret(workflowId: string): Promise<string> {
		const workflow = await this.workflowRepository.get({ id: workflowId });

		if (!workflow) {
			throw new BadRequestError('Workflow not found');
		}

		for (const node of workflow.nodes ?? []) {
			if (node.type !== 'n8n-nodes-base.webhook' && node.type !== 'webhook') {
				continue;
			}

			const hookParams = toExecutionContextEstablishmentHookParameter(node.parameters);
			if (!hookParams?.success) {
				continue;
			}

			for (const hook of hookParams.data.contextEstablishmentHooks.hooks) {
				if (hook.hookName === 'SlackRequestExtractor') {
					const signingSecret = (hook as Record<string, unknown>)['signingSecret'];
					if (typeof signingSecret === 'string' && signingSecret.length > 0) {
						return signingSecret;
					}
				}
			}
		}

		throw new BadRequestError(
			'No SlackRequestExtractor hook with signing secret found in workflow',
		);
	}

	private getHeaderValue(req: Request, headerName: string): string | undefined {
		const value = req.headers[headerName];
		if (typeof value === 'string') {
			return value;
		}
		if (Array.isArray(value) && value.length > 0) {
			return value[0];
		}
		return undefined;
	}
}
