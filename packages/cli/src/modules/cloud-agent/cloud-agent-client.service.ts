import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { IUser } from 'n8n-workflow';

import { N8N_VERSION } from '../../constants';
import { License } from '../../license';

/**
 * Thin SDK-style client for the cloud agent's /v1/agent/* endpoints. This is
 * temporary scaffolding — once @n8n_io/ai-assistant-sdk@1.22.0 lands in the
 * workspace catalog, this class is replaced by the SDK's
 * AiAssistantClient.startAgentRun / postAgentToolResult / cancelAgentRun /
 * getAgentEventsUrl methods.
 *
 * Mirrors AiService's auth-token lifecycle (license cert -> POST /auth/token
 * -> bearer -> retry on 401).
 */
@Service()
export class AgentClient {
	private activeToken: string | undefined;

	constructor(
		private readonly licenseService: License,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	private baseUrl(): string {
		return (
			this.globalConfig.cloudAgent.baseUrl ||
			this.globalConfig.aiAssistant.baseUrl ||
			'https://ai-assistant.n8n.io'
		);
	}

	private async getHeaders(user: IUser): Promise<HeadersInit> {
		if (!this.activeToken) await this.refreshAuthToken();
		return {
			'Content-Type': 'application/json',
			authorization: `Bearer ${this.activeToken}`,
			'x-consumer-id': this.licenseService.getConsumerId(),
			'x-user-id': user.id,
			'x-n8n-version': N8N_VERSION,
			'x-instance-id': this.instanceSettings.instanceId,
		};
	}

	private async refreshAuthToken(): Promise<void> {
		const licenseCert = await this.licenseService.loadCertStr();
		const response = await fetch(`${this.baseUrl()}/auth/token`, {
			method: 'POST',
			body: JSON.stringify({ licenseCert }),
			headers: { 'Content-Type': 'application/json' },
		});
		if (!response.ok) {
			throw new Error(`Agent /auth/token failed: ${response.status} ${response.statusText}`);
		}
		const data = (await response.json()) as { accessToken?: string };
		if (typeof data.accessToken !== 'string') {
			throw new Error('Agent /auth/token returned no accessToken');
		}
		this.activeToken = data.accessToken;
	}

	private async postJson<T>(
		endpoint: string,
		body: unknown,
		user: IUser,
		retry = true,
	): Promise<T> {
		const url = `${this.baseUrl()}${endpoint}`;
		const headers = await this.getHeaders(user);
		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		if (response.status === 401 && retry) {
			this.activeToken = undefined;
			return await this.postJson<T>(endpoint, body, user, false);
		}

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			throw new Error(`Agent ${endpoint} failed: ${response.status} ${text}`);
		}

		return (await response.json()) as T;
	}

	/** POST /v1/agent/chat */
	async startRun(
		payload: { threadId: string; message: string },
		user: IUser,
	): Promise<{ runId: string }> {
		return await this.postJson<{ runId: string }>('/v1/agent/chat', payload, user);
	}

	/** GET /v1/agent/events/:threadId — returns the raw Response so the caller can pipe SSE. */
	async openEventStream(threadId: string, user: IUser, lastEventId?: number): Promise<Response> {
		const headers = await this.getHeaders(user);
		const query = lastEventId !== undefined ? `?lastEventId=${lastEventId}` : '';
		const url = `${this.baseUrl()}/v1/agent/events/${encodeURIComponent(threadId)}${query}`;
		const response = await fetch(url, { headers });
		if (response.status === 401) {
			this.activeToken = undefined;
			const retryHeaders = await this.getHeaders(user);
			return await fetch(url, { headers: retryHeaders });
		}
		return response;
	}

	/** POST /v1/agent/runs/:runId/tool-result */
	async postToolResult(
		runId: string,
		payload: { toolCallId: string; output: unknown; isError: boolean },
		user: IUser,
	): Promise<void> {
		await this.postJson(`/v1/agent/runs/${encodeURIComponent(runId)}/tool-result`, payload, user);
	}

	/** POST /v1/agent/runs/:runId/cancel */
	async cancelRun(runId: string, user: IUser): Promise<{ cancelled: boolean }> {
		return await this.postJson<{ cancelled: boolean }>(
			`/v1/agent/runs/${encodeURIComponent(runId)}/cancel`,
			{},
			user,
		);
	}
}
