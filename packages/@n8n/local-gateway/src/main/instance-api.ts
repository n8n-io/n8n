import type {
	DesktopAssistantHistoryResponse,
	DesktopAssistantPromoteRequest,
	DesktopAssistantPromoteResponse,
	DesktopAssistantTaskOutcome,
	DesktopAssistantTaskRequest,
	DesktopAssistantTaskResponse,
	DesktopAssistantTaskRunEvent,
	DesktopAssistantTasksResponse,
	InsightsSummary,
	InstanceAiRichMessagesResponse,
} from '@n8n/api-types';
import { logger } from '@n8n/computer-use/logger';

import type { DesktopAssistantHistoryParams, DesktopAssistantTimeSaved } from '../shared/types';
import type { OAuthFlow } from './oauth/oauth-flow';

/** Day in ms, for the trailing time-saved ranges. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Abort instance requests that stall so IPC handlers can't hang the renderer. */
const REQUEST_TIMEOUT_MS = 15_000;

/** Overall deadline for waiting on an assistant run over SSE; the run may keep going on the instance. */
const RUN_FINISH_TIMEOUT_MS = 10 * 60 * 1000;

/** Final outcome of waiting for an assistant run; see {@link InstanceApi.waitForRunFinish}. */
export interface AssistantRunOutcome {
	status: 'success' | 'error' | 'canceled' | 'timeout';
	/** Whether the run made any tool calls — false means the assistant declined the ask. */
	tookAction: boolean;
	/** The agent's structured self-report, when it filed one. */
	outcome?: DesktopAssistantTaskOutcome;
}

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
	 * `POST /rest/desktop-assistant/task` — start a one-shot assistant run from a
	 * natural-language prompt. Returns the thread/run pair to wait on via
	 * {@link waitForRunFinish}.
	 */
	async createAssistantTask(prompt: string, appHint?: string): Promise<DesktopAssistantTaskResponse> {
		const body: DesktopAssistantTaskRequest = appHint
			? { prompt, context: { appHint } }
			: { prompt };
		const response = await this.authedFetch('/desktop-assistant/task', {
			method: 'POST',
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});
		return await this.unwrap<DesktopAssistantTaskResponse>(response);
	}

	/**
	 * `POST /rest/desktop-assistant/promote-thread` — materialise an assistant
	 * thread into a saved, editable workflow. Idempotent: returns `building` (with
	 * the build run to wait on) the first time, and `done` (with the workflow id)
	 * once a previous promote already produced a workflow. `name`, when given, is
	 * used as the saved workflow's name.
	 */
	async promoteThread(threadId: string, name?: string): Promise<DesktopAssistantPromoteResponse> {
		const body: DesktopAssistantPromoteRequest = name ? { threadId, name } : { threadId };
		const response = await this.authedFetch('/desktop-assistant/promote-thread', {
			method: 'POST',
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});
		return await this.unwrap<DesktopAssistantPromoteResponse>(response);
	}

	/**
	 * `GET /rest/desktop-assistant/task-run/events?threadId=&runId=` — follow the
	 * BFF's SSE view of a single run until it finishes, and report how it ended.
	 *
	 * The stream is already scoped to the run and speaks the small
	 * `DesktopAssistantTaskRunEvent` vocabulary: at most one `acting`, then a
	 * terminal `finished` after which the server closes the stream. Resolves on
	 * `finished`, or with `timeout` after 10 minutes — the run may still finish
	 * on the instance. Rejects with {@link InstanceApiError} when the stream
	 * itself fails (not signed in, non-2xx response, network drop, or the stream
	 * closing without a `finished` event).
	 */
	async waitForRunFinish(threadId: string, runId: string): Promise<AssistantRunOutcome> {
		const { instanceUrl } = this.oauthFlow.getStatus();
		const token = await this.oauthFlow.getValidAccessToken();
		if (!instanceUrl || !token) {
			throw new InstanceApiError('Not signed in', 401);
		}

		// Not authedFetch: its 15s timeout would kill a long-lived SSE stream.
		// One AbortController doubles as the overall deadline and stream cleanup.
		const abort = new AbortController();
		const deadline = setTimeout(() => abort.abort(), RUN_FINISH_TIMEOUT_MS);
		const query = new URLSearchParams({ threadId, runId });
		let tookAction = false;
		try {
			const response = await fetch(
				`${instanceUrl}/rest/desktop-assistant/task-run/events?${query.toString()}`,
				{
					headers: {
						// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
						authorization: `Bearer ${token}`,
						accept: 'text/event-stream',
					},
					signal: abort.signal,
				},
			);
			if (!response.ok || !response.body) {
				throw new InstanceApiError(
					`Run event stream for thread ${threadId} failed (${response.status})`,
					response.status,
				);
			}

			for await (const event of readSseEvents(response.body)) {
				if (!isTaskRunEvent(event)) continue;
				// `acting` only feeds the timeout fallback today; it's the hook for a
				// live "doing" signal in the composer later.
				if (event.type === 'acting') tookAction = true;
				if (event.type === 'finished') {
					return { status: event.status, tookAction: event.tookAction, outcome: event.outcome };
				}
			}
			// The server closes the stream right after `finished`, so reaching the
			// end without one means the stream broke mid-run.
			throw new InstanceApiError('Run event stream ended before the run finished');
		} catch (error) {
			if (abort.signal.aborted) return { status: 'timeout', tookAction };
			if (error instanceof InstanceApiError) throw error;
			const reason = error instanceof Error ? error.message : String(error);
			logger.error('Run event stream failed', { threadId, runId, error: reason });
			throw new InstanceApiError(reason);
		} finally {
			clearTimeout(deadline);
			// Close the SSE connection on every exit path (deadline, errors, finish).
			abort.abort();
		}
	}

	/** `GET /rest/instance-ai/threads/:threadId/messages` — the thread's stored messages plus the `nextEventId` SSE cursor. */
	async getThreadMessages(threadId: string): Promise<InstanceAiRichMessagesResponse> {
		const response = await this.authedFetch(
			`/instance-ai/threads/${encodeURIComponent(threadId)}/messages`,
		);
		return await this.unwrap<InstanceAiRichMessagesResponse>(response);
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

/** Narrow a parsed SSE payload to the `DesktopAssistantTaskRunEvent` vocabulary. */
function isTaskRunEvent(value: unknown): value is DesktopAssistantTaskRunEvent {
	if (typeof value !== 'object' || value === null) return false;
	const { type } = value as Partial<DesktopAssistantTaskRunEvent>;
	return type === 'acting' || type === 'finished';
}

/**
 * Minimal SSE reader: splits the byte stream into frames on blank lines, joins
 * multi-line `data:` fields, and yields each frame's JSON-parsed data. Ignores
 * comments, `id:`/`event:` fields (events are discriminated by `data.type`),
 * and frames without parseable JSON data.
 */
async function* readSseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
	const decoder = new TextDecoder();
	let buffer = '';
	for await (const chunk of body) {
		buffer += decoder.decode(chunk, { stream: true });
		let separator: number;
		while ((separator = buffer.indexOf('\n\n')) !== -1) {
			const frame = buffer.slice(0, separator);
			buffer = buffer.slice(separator + 2);
			const data = frame
				.split('\n')
				.filter((line) => line.startsWith('data:'))
				.map((line) => line.slice('data:'.length).trimStart())
				.join('\n');
			if (!data) continue;
			try {
				yield JSON.parse(data);
			} catch {
				// Not JSON (e.g. keep-alive noise) — skip the frame.
			}
		}
	}
}
