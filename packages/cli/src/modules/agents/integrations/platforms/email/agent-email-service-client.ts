import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

type ProvisionedEmailChannel = {
	channelId: string;
	address: string;
	callbackSecret: string;
};

@Service()
export class AgentEmailServiceClient {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly agentsConfig: AgentsConfig,
	) {}

	async provision(agentId: string, callbackUrl: string): Promise<ProvisionedEmailChannel> {
		const response = await this.request('/v1/agent-email/channels', {
			method: 'POST',
			body: JSON.stringify({ agentId, callbackUrl }),
		});

		if (
			!isRecord(response) ||
			typeof response.channelId !== 'string' ||
			typeof response.address !== 'string' ||
			typeof response.callbackSecret !== 'string'
		) {
			throw new BadRequestError('Agent Email service returned an invalid channel');
		}

		return {
			channelId: response.channelId,
			address: response.address,
			callbackSecret: response.callbackSecret,
		};
	}

	async reply(channelId: string, messageId: string, text: string): Promise<void> {
		await this.request(
			`/v1/agent-email/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/reply`,
			{ method: 'POST', body: JSON.stringify({ text }) },
		);
	}

	private async request(path: string, init: RequestInit): Promise<unknown> {
		const baseUrl = this.globalConfig.aiAssistant.baseUrl.replace(/\/$/, '');
		const token = this.agentsConfig.emailServiceToken;
		if (!baseUrl || !token) {
			throw new BadRequestError('Agent Email service is not configured');
		}

		// ponytail: Shared POC bearer token; replace with license-bound service authentication.
		const response = await fetch(`${baseUrl}${path}`, {
			...init,
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) {
			throw new BadRequestError(
				`Agent Email service request failed (${response.status}): ${await response.text()}`,
			);
		}

		return response.status === 204 ? undefined : await response.json();
	}
}
