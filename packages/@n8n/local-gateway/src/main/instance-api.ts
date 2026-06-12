import type {
	DesktopAssistantApplyEditsRequest,
	DesktopAssistantApplyEditsResponse,
	DesktopAssistantHistoryResponse,
	DesktopAssistantPromoteRequest,
	DesktopAssistantPromoteResponse,
	DesktopAssistantRecommendationsRequest,
	DesktopAssistantRecommendationsResponse,
	DesktopAssistantTaskDetailResponse,
	DesktopAssistantTaskRequest,
	DesktopAssistantTaskResponse,
	DesktopAssistantTasksResponse,
	InsightsSummary,
	InstanceAiConfirmRequest,
	InstanceAiRichMessagesResponse,
} from '@n8n/api-types';
import { logger } from '@n8n/computer-use/logger';

import type {
	DesktopAssistantHistoryParams,
	DesktopAssistantTimeSaved,
	PromoteAssistantThreadOptions,
} from '../shared/types';
import type { OAuthFlow } from './oauth/oauth-flow';

/** Day in ms, for the trailing time-saved ranges. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Abort instance requests that stall so IPC handlers can't hang the renderer. */
const REQUEST_TIMEOUT_MS = 15_000;

/** The task-detail description is LLM-generated on first open, which can take
 * well beyond the default request timeout. */
const DETAIL_TIMEOUT_MS = 60_000;

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
	 * `GET /rest/insights/summary` for the History tab's "Time saved" panel, over a
	 * trailing-week and trailing-month range. The `timeSaved` metric is not
	 * license-gated, but the insights *history* is (default 7 days unlicensed), so
	 * the 30-day month call 403s on free tier — each figure is fetched independently
	 * and degrades to `null` on any error rather than failing the whole panel.
	 */
	async getTimeSaved(): Promise<DesktopAssistantTimeSaved> {
		const end = new Date();
		const [weekMinutes, monthMinutes] = await Promise.all([
			this.fetchTimeSavedMinutes(new Date(end.getTime() - 7 * DAY_MS), end),
			this.fetchTimeSavedMinutes(new Date(end.getTime() - 30 * DAY_MS), end),
		]);
		return { weekMinutes, monthMinutes };
	}

	/** Minutes saved over a range, or `null` when insights is unavailable (e.g. license-capped, disabled, or unauthorized). */
	private async fetchTimeSavedMinutes(start: Date, end: Date): Promise<number | null> {
		const query = new URLSearchParams({
			startDate: start.toISOString(),
			endDate: end.toISOString(),
		});
		try {
			const response = await this.authedFetch(`/insights/summary?${query.toString()}`);
			const summary = await this.unwrap<InsightsSummary>(response);
			return summary.timeSaved.value;
		} catch (error) {
			if (error instanceof InstanceApiError) return null;
			throw error;
		}
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
	 * `POST /rest/desktop-assistant/task` — fire a one-shot task with the prompt
	 * and the locally-detected context (structured pointer fields + optional
	 * screenshot attachment). Returns the thread/run pair; the renderer follows
	 * the run on the thread event stream (see `renderer/assistant/run-watcher.ts`).
	 */
	async triggerTask(body: DesktopAssistantTaskRequest): Promise<DesktopAssistantTaskResponse> {
		const response = await this.authedFetch('/desktop-assistant/task', {
			method: 'POST',
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});
		return await this.unwrap<DesktopAssistantTaskResponse>(response);
	}

	/**
	 * `POST /rest/desktop-assistant/recommendations` — generate task suggestions
	 * for the empty state from the optional selected context and the user's
	 * connected integrations.
	 */
	async getRecommendations(
		body: DesktopAssistantRecommendationsRequest,
	): Promise<DesktopAssistantRecommendationsResponse> {
		const response = await this.authedFetch('/desktop-assistant/recommendations', {
			method: 'POST',
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});
		return await this.unwrap<DesktopAssistantRecommendationsResponse>(response);
	}

	/**
	 * `GET /rest/desktop-assistant/tasks/:id/detail` — the task detail view's
	 * segmented description (stored on the workflow at creation) plus the
	 * credential types still missing.
	 *
	 * Normally a simple read, but workflows predating stored descriptions
	 * generate one on first open, which can exceed the default request
	 * timeout — so this call gets a longer one.
	 */
	async getTaskDetail(workflowId: string): Promise<DesktopAssistantTaskDetailResponse> {
		const response = await this.authedFetch(
			`/desktop-assistant/tasks/${encodeURIComponent(workflowId)}/detail`,
			{ signal: AbortSignal.timeout(DETAIL_TIMEOUT_MS) },
		);
		return await this.unwrap<DesktopAssistantTaskDetailResponse>(response);
	}

	/**
	 * `POST /rest/desktop-assistant/tasks/:id/edits` — apply the user's chip edits
	 * to the workflow via an Instance AI run. Returns the thread/run ids; the
	 * caller follows the run over the thread's SSE stream.
	 */
	async applyTaskEdits(
		workflowId: string,
		body: DesktopAssistantApplyEditsRequest,
	): Promise<DesktopAssistantApplyEditsResponse> {
		const response = await this.authedFetch(
			`/desktop-assistant/tasks/${encodeURIComponent(workflowId)}/edits`,
			{
				method: 'POST',
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			},
		);
		return await this.unwrap<DesktopAssistantApplyEditsResponse>(response);
	}

	/** `POST /rest/workflows/:id/archive` — soft-delete a task's workflow; it drops out of the task list but stays restorable in n8n. */
	async archiveWorkflow(workflowId: string): Promise<void> {
		await this.authedFetch(`/workflows/${encodeURIComponent(workflowId)}/archive`, {
			method: 'POST',
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({}),
		});
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

	/**
	 * `POST /rest/desktop-assistant/promote-thread` — materialise an assistant
	 * thread into a saved, editable workflow. Idempotent: returns `building` (with
	 * the build run to wait on) until the build completes, then `done` with the
	 * workflow id.
	 */
	async promoteThread(
		threadId: string,
		name?: string,
		icon?: string,
		options?: PromoteAssistantThreadOptions,
	): Promise<DesktopAssistantPromoteResponse> {
		const body: DesktopAssistantPromoteRequest = {
			threadId,
			...(name ? { name } : {}),
			...(icon ? { icon } : {}),
			...(options?.configuredParts ? { configuredParts: options.configuredParts } : {}),
			...(options?.estimatedMinutesSaved
				? { estimatedMinutesSaved: options.estimatedMinutesSaved }
				: {}),
			// The machine's IANA zone, pinned as the new workflow's timezone so
			// schedules fire in the user's local time, not the instance default.
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		};
		const response = await this.authedFetch('/desktop-assistant/promote-thread', {
			method: 'POST',
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});
		return await this.unwrap<DesktopAssistantPromoteResponse>(response);
	}

	/** `GET /rest/instance-ai/threads/:threadId/messages` — the thread's stored messages plus the `nextEventId` SSE cursor. */
	async getThreadMessages(threadId: string): Promise<InstanceAiRichMessagesResponse> {
		const response = await this.authedFetch(
			`/instance-ai/threads/${encodeURIComponent(threadId)}/messages`,
		);
		return await this.unwrap<InstanceAiRichMessagesResponse>(response);
	}

	/** `POST /rest/instance-ai/chat/:threadId` — send a user message; the reply streams over the thread's SSE events. */
	async sendChatMessage(threadId: string, message: string): Promise<{ runId: string }> {
		const response = await this.authedFetch(`/instance-ai/chat/${encodeURIComponent(threadId)}`, {
			method: 'POST',
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				message,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			}),
		});
		return await this.unwrap<{ runId: string }>(response);
	}

	/** `POST /rest/instance-ai/chat/:threadId/cancel` — stop the thread's active run; it finishes with a `cancelled` run-finish event. */
	async cancelRun(threadId: string): Promise<void> {
		const response = await this.authedFetch(
			`/instance-ai/chat/${encodeURIComponent(threadId)}/cancel`,
			{
				method: 'POST',
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({}),
			},
		);
		await this.unwrap<{ ok: boolean }>(response);
	}

	/** `POST /rest/instance-ai/confirm/:requestId` — resolve a pending confirmation; the suspended run resumes. */
	async confirmRequest(requestId: string, body: InstanceAiConfirmRequest): Promise<void> {
		const response = await this.authedFetch(
			`/instance-ai/confirm/${encodeURIComponent(requestId)}`,
			{
				method: 'POST',
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			},
		);
		await this.unwrap<{ ok: boolean }>(response);
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

	/** Editor URL for a workflow with the Set up panel pre-opened, or `null` when signed out. */
	workflowSetupUrl(workflowId: string): string | null {
		const url = this.workflowUrl(workflowId);
		return url ? `${url}?action=openSetup` : null;
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
				// A caller-provided signal (e.g. the longer detail-generation timeout)
				// wins over the default stall guard.
				signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
