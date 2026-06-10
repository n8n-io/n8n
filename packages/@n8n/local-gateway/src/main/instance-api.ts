import type {
	DesktopAssistantHistoryResponse,
	DesktopAssistantTasksResponse,
} from '@n8n/api-types';
import { logger } from '@n8n/computer-use/logger';

import type { DesktopAssistantHistoryParams } from '../shared/types';
import type { OAuthFlow } from './oauth/oauth-flow';

/** Abort instance requests that stall so IPC handlers can't hang the renderer. */
const REQUEST_TIMEOUT_MS = 15_000;

export class InstanceApiError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message);
		this.name = 'InstanceApiError';
	}
}

/**
 * Thin authenticated client for the signed-in n8n instance. The desktop app is a
 * client of the same REST surface the editor uses; this proxies a handful of those
 * endpoints from the main process so the OAuth access token never reaches the renderer.
 */
export class InstanceApi {
	constructor(private readonly oauthFlow: OAuthFlow) {}

	/** `GET /rest/desktop-assistant/tasks` — the three classified task buckets. */
	async getTasks(): Promise<DesktopAssistantTasksResponse> {
		const response = await this.authedFetch('/desktop-assistant/tasks');
		const tasks = await this.unwrap<DesktopAssistantTasksResponse>(response);
		return this.absolutizeIconUrls(tasks);
	}

	/**
	 * `GET /rest/desktop-assistant/history` — a newest-first page of recent
	 * executions across the user's workflows. `lastId` walks older (the "Load
	 * more" cursor); `firstId`/`limit` are passed through verbatim.
	 */
	async getHistory(
		params: DesktopAssistantHistoryParams = {},
	): Promise<DesktopAssistantHistoryResponse> {
		const query = new URLSearchParams();
		if (params.limit !== undefined) query.set('limit', String(params.limit));
		if (params.firstId) query.set('firstId', params.firstId);
		if (params.lastId) query.set('lastId', params.lastId);
		const qs = query.toString();
		const response = await this.authedFetch(`/desktop-assistant/history${qs ? `?${qs}` : ''}`);
		return await this.unwrap<DesktopAssistantHistoryResponse>(response);
	}

	/**
	 * Node icons come back as instance-relative paths (e.g. `icons/.../slack.svg`);
	 * prefix them with the instance origin so the renderer can load them directly.
	 */
	private absolutizeIconUrls(tasks: DesktopAssistantTasksResponse): DesktopAssistantTasksResponse {
		const { instanceUrl } = this.oauthFlow.getStatus();
		if (!instanceUrl) return tasks;
		const fix = (card: DesktopAssistantTasksResponse['actionNeeded'][number]) => {
			if (card.icon.type !== 'node' || !card.icon.iconUrl) return;
			if (/^https?:\/\//i.test(card.icon.iconUrl)) return;
			const path = card.icon.iconUrl.startsWith('/') ? card.icon.iconUrl : `/${card.icon.iconUrl}`;
			card.icon = { ...card.icon, iconUrl: `${instanceUrl}${path}` };
		};
		tasks.actionNeeded.forEach(fix);
		tasks.upcoming.forEach(fix);
		tasks.readyToRun.forEach(fix);
		return tasks;
	}

	/**
	 * `POST /rest/workflows/:id/run` — kick off a manual run of a saved task.
	 *
	 * The manual-run endpoint needs to know which trigger to start from; an empty
	 * body is treated as a partial execution and is rejected. So we load the
	 * workflow, locate its trigger node, and start a full run from it.
	 */
	async runWorkflow(workflowId: string): Promise<{ executionId?: string }> {
		const trigger = await this.findTriggerNode(workflowId);
		const body = trigger ? { triggerToStartFrom: { name: trigger } } : {};
		const response = await this.authedFetch(`/workflows/${encodeURIComponent(workflowId)}/run`, {
			method: 'POST',
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});
		return await this.unwrap<{ executionId?: string }>(response);
	}

	/** Find the workflow's trigger node name so a manual run knows where to start. */
	private async findTriggerNode(workflowId: string): Promise<string | undefined> {
		const response = await this.authedFetch(`/workflows/${encodeURIComponent(workflowId)}`);
		const workflow = await this.unwrap<{ nodes?: Array<{ name: string; type: string }> }>(response);
		const nodes = workflow.nodes ?? [];
		const trigger =
			nodes.find((node) => node.type === 'n8n-nodes-base.manualTrigger') ??
			nodes.find((node) => /trigger$/i.test(node.type)) ??
			nodes.find((node) => /webhook/i.test(node.type));
		return trigger?.name;
	}

	/** Public editor URL for a workflow on the signed-in instance, or `null` when signed out. */
	workflowUrl(workflowId: string): string | null {
		const { instanceUrl } = this.oauthFlow.getStatus();
		return instanceUrl ? `${instanceUrl}/workflow/${encodeURIComponent(workflowId)}` : null;
	}

	/** Public editor URL for a single execution, or `null` when signed out. */
	executionUrl(workflowId: string, executionId: string): string | null {
		const { instanceUrl } = this.oauthFlow.getStatus();
		if (!instanceUrl) return null;
		return `${instanceUrl}/workflow/${encodeURIComponent(workflowId)}/executions/${encodeURIComponent(executionId)}`;
	}

	/** Every n8n REST endpoint wraps its payload in a `data` key; peel it off. */
	private async unwrap<T>(response: Response): Promise<T> {
		const body = (await response.json()) as { data: T };
		return body.data;
	}

	private async authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
		const { instanceUrl } = this.oauthFlow.getStatus();
		const token = await this.oauthFlow.getValidAccessToken();
		if (!instanceUrl || !token) {
			throw new InstanceApiError('Not signed in', 401);
		}

		let response: Response;
		try {
			response = await fetch(`${instanceUrl}/rest${path}`, {
				...init,
				headers: {
					// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
					authorization: `Bearer ${token}`,
					accept: 'application/json',
					...init.headers,
				},
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			logger.error('Instance request failed', { path, error: reason });
			throw new InstanceApiError(reason);
		}

		if (!response.ok) {
			// Surface the server's own message (n8n errors are `{ message }`) so the
			// failure is diagnosable instead of an opaque "request failed".
			const detail = await this.readErrorMessage(response);
			throw new InstanceApiError(
				`Request to ${path} failed (${response.status})${detail ? `: ${detail}` : ''}`,
				response.status,
			);
		}
		return response;
	}

	private async readErrorMessage(response: Response): Promise<string | undefined> {
		try {
			const body = (await response.json()) as { message?: string };
			return body.message;
		} catch {
			return undefined;
		}
	}
}
