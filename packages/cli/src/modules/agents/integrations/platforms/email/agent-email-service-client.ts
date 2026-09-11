import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { createHmac } from 'node:crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

type ProvisionedEmailChannel = {
	channelId: string;
	address: string;
	callbackSecret: string;
};

export type AgentEmailReplyAttachment = {
	filename: string;
	contentType: string;
	/** Base64-encoded file bytes. */
	content?: string;
	/** Public or pre-signed URL that AgentMail can download. */
	url?: string;
};

const JSON_TIMEOUT_MS = 10_000;
const FILE_TIMEOUT_MS = 60_000;
const SIGNED_ATTACHMENT_TTL_SECONDS = 10 * 60;

@Service()
export class AgentEmailServiceClient {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly agentsConfig: AgentsConfig,
	) {}

	async provision(agentId: string, callbackUrl: string): Promise<ProvisionedEmailChannel> {
		const response = await this.requestJson('/v1/agent-email/channels', {
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

	async reply(
		channelId: string,
		messageId: string,
		text: string,
		attachments?: AgentEmailReplyAttachment[],
	): Promise<void> {
		await this.requestJson(
			`/v1/agent-email/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/reply`,
			{
				method: 'POST',
				body: JSON.stringify({
					text,
					...(attachments?.length ? { attachments } : {}),
				}),
			},
			attachments?.length ? FILE_TIMEOUT_MS : JSON_TIMEOUT_MS,
		);
	}

	async getAttachment(channelId: string, messageId: string, attachmentId: string): Promise<Buffer> {
		const response = await this.fetchPath(
			`/v1/agent-email/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
			{ method: 'GET' },
			FILE_TIMEOUT_MS,
		);
		return Buffer.from(await response.arrayBuffer());
	}

	getSignedAttachmentUrl(
		channelId: string,
		messageId: string,
		attachmentId: string,
		callbackSecret: string,
	): string | undefined {
		const baseUrl =
			this.agentsConfig.emailServicePublicBaseUrl || this.globalConfig.aiAssistant.baseUrl;
		if (!baseUrl) return undefined;

		if (!URL.canParse(baseUrl)) return undefined;
		const parsedBaseUrl = new URL(baseUrl);
		if (parsedBaseUrl.protocol !== 'https:') return undefined;

		const expires = Math.floor(Date.now() / 1000) + SIGNED_ATTACHMENT_TTL_SECONDS;
		const path =
			`/v1/agent-email/channels/${encodeURIComponent(channelId)}` +
			`/messages/${encodeURIComponent(messageId)}` +
			`/attachments/${encodeURIComponent(attachmentId)}/download`;
		const url = new URL(`${baseUrl.replace(/\/$/, '')}${path}`);
		url.searchParams.set('expires', expires.toString());
		url.searchParams.set(
			'signature',
			signAttachmentUrl(callbackSecret, channelId, messageId, attachmentId, expires),
		);
		return url.toString();
	}

	private async requestJson(
		path: string,
		init: RequestInit,
		timeoutMs = JSON_TIMEOUT_MS,
	): Promise<unknown> {
		const response = await this.fetchPath(path, init, timeoutMs);
		return response.status === 204 ? undefined : await response.json();
	}

	private async fetchPath(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
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
			signal: AbortSignal.timeout(timeoutMs),
		});
		if (!response.ok) {
			throw new BadRequestError(
				`Agent Email service request failed (${response.status}): ${await response.text()}`,
			);
		}
		return response;
	}
}

function signAttachmentUrl(
	secret: string,
	channelId: string,
	messageId: string,
	attachmentId: string,
	expires: number,
): string {
	const encodedSecret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
	return createHmac('sha256', Buffer.from(encodedSecret, 'base64'))
		.update(JSON.stringify([channelId, messageId, attachmentId, expires]))
		.digest('base64url');
}
