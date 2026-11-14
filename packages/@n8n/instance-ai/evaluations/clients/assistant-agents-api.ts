// ---------------------------------------------------------------------------
// HTTP transport for the Assistant agent on the Agents runtime.
//
// `N8nClient` owns one instance when the harness runs with
// `--assistant-runtime agents`, and sends every thread-tied call here. The
// Instance AI routes stay in `n8n-client.ts`. To drop that runtime later, keep
// this module and delete the Instance AI branches there.
// ---------------------------------------------------------------------------

import type {
	AgentChatMessagesResponse,
	AgentThreadUsageResponse,
	InstanceAiAssistantEvalCreateThreadRequest,
	InstanceAiAssistantEvalThreadOverridesRequest,
	InstanceAiConfirmRequest,
	InstanceAiHandoffContext,
	InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

export const ASSISTANT_RUNTIMES = ['instance-ai', 'agents'] as const;
export type AssistantRuntime = (typeof ASSISTANT_RUNTIMES)[number];

/** System-agent chat routes of the Assistant agent. */
export const ASSISTANT_AGENT_BASE = '/rest/agents/system/assistant';

/** Eval-only routes of the Assistant agent. Same bodies as `/rest/instance-ai/eval`. */
export const ASSISTANT_AGENT_EVAL_BASE = '/rest/assistant/eval';

/** Turn overrides of a thread: the prompt version. */
export type AssistantEvalThreadOverridesBody = InstanceAiAssistantEvalThreadOverridesRequest;

/** The fields of an Agents chat message that the harness sets. */
export interface AssistantAgentMessageOptions {
	attachments?: InstanceAiResourceAttachment[];
	context?: InstanceAiHandoffContext;
	/** Thread overrides. Sent once per thread through the eval route, before the first message. */
	overrides?: AssistantEvalThreadOverridesBody;
}

/** One SSE event of a chat or resume response. */
export type AssistantSseEvent = Record<string, unknown> & { type: string };

/**
 * What the API needs from `N8nClient`: a JSON request that throws on non-2xx,
 * and an SSE POST that returns the first event that `stop` accepts.
 */
export interface AssistantAgentsTransport {
	request(
		path: string,
		options?: { method?: string; body?: unknown; timeoutMs?: number },
	): Promise<unknown>;
	postSseUntil(
		path: string,
		body: unknown,
		stop: (event: AssistantSseEvent) => boolean,
	): Promise<AssistantSseEvent | undefined>;
}

// -- Response shapes ----------------------------------------------------------

const executionStatusSchema = z.enum([
	'running',
	'success',
	'error',
	'cancelled',
	'interrupted',
	'awaiting',
]);

const contentPartSchema = z
	.object({
		type: z.string(),
		text: z.string().optional(),
		toolName: z.string().optional(),
		toolCallId: z.string().optional(),
		input: z.unknown().optional(),
		suspendPayload: z.unknown().optional(),
		state: z.string().optional(),
		output: z.unknown().optional(),
		canceled: z.boolean().optional(),
		error: z.string().optional(),
		startTime: z.number().optional(),
		endTime: z.number().optional(),
	})
	.passthrough();

const messagesResponseSchema = z.object({
	messages: z.array(
		z
			.object({
				id: z.string(),
				role: z.string(),
				content: z.array(contentPartSchema),
				executionId: z.string().optional(),
				executionStatus: executionStatusSchema.optional(),
				executionError: z.string().optional(),
				createdAt: z.string().optional(),
			})
			.passthrough(),
	),
	openSuspensions: z.array(
		z.object({
			toolCallId: z.string(),
			runId: z.string(),
			suspendPayload: z.unknown().optional(),
		}),
	),
	activeExecutionId: z.string().nullable().optional(),
});

const usageSchema = z.object({
	promptTokens: z.number().nullable(),
	completionTokens: z.number().nullable(),
	totalTokens: z.number().nullable(),
	cacheReadTokens: z.number().nullable(),
	cacheWriteTokens: z.number().nullable(),
	cost: z.number().nullable(),
});

const usageEntrySchema = usageSchema.extend({
	executionId: z.string(),
	threadId: z.string(),
	parentExecutionId: z.string().nullable(),
	status: executionStatusSchema,
	model: z.string().nullable(),
	startedAt: z.string().nullable(),
	stoppedAt: z.string().nullable(),
	duration: z.number(),
});

const threadUsageResponseSchema = z.object({
	executions: z.array(
		usageEntrySchema.extend({ descendants: z.array(usageEntrySchema), total: usageSchema }),
	),
	total: usageSchema,
});

const moduleSettingsSchema = z.object({
	'instance-ai': z.object({ assistantAgentEnabled: z.boolean().optional() }).optional(),
});

/** n8n REST routes wrap the payload in `{ data }`. */
function unwrapData(result: unknown): unknown {
	return isRecord(result) && 'data' in result ? result.data : result;
}

// -- API ----------------------------------------------------------------------

export class AssistantAgentsApi {
	readonly evalBase = ASSISTANT_AGENT_EVAL_BASE;

	/** Project of each thread this client created. A new session needs it on the chat route. */
	private readonly projectByThread = new Map<string, string>();

	/** Threads that already got their overrides. */
	private readonly overridesSent = new Set<string>();

	constructor(private readonly transport: AssistantAgentsTransport) {}

	/** Fail fast when the instance does not serve the Assistant agent. */
	async assertEnabled(): Promise<void> {
		const settings = moduleSettingsSchema.safeParse(
			unwrapData(await this.transport.request('/rest/module-settings')),
		);
		if (settings.success && settings.data['instance-ai']?.assistantAgentEnabled === true) return;
		throw new Error(
			'--assistant-runtime agents needs the Assistant agent, but this instance reports ' +
				"`module-settings['instance-ai'].assistantAgentEnabled` as not true. " +
				'Enable the Assistant agent on the instance, or run with --assistant-runtime instance-ai.',
		);
	}

	/**
	 * POST /rest/assistant/eval/threads. The route stores `source` and
	 * `sourceContext` in the thread metadata, and each turn trace shows them.
	 */
	async createThread(
		threadId: string,
		projectId: string,
		provenance: Pick<InstanceAiAssistantEvalCreateThreadRequest, 'source' | 'sourceContext'> = {},
	): Promise<void> {
		await this.transport.request(`${this.evalBase}/threads`, {
			method: 'POST',
			body: {
				threadId,
				projectId,
				...provenance,
			} satisfies InstanceAiAssistantEvalCreateThreadRequest,
		});
		this.projectByThread.set(threadId, projectId);
	}

	/** DELETE /rest/assistant/eval/threads/:threadId */
	async deleteThread(threadId: string): Promise<void> {
		await this.transport.request(`${this.evalBase}/threads/${threadId}`, { method: 'DELETE' });
		this.projectByThread.delete(threadId);
		this.overridesSent.delete(threadId);
	}

	/** PUT /rest/assistant/eval/threads/:threadId/overrides (replace semantics) */
	async setThreadOverrides(
		threadId: string,
		overrides: AssistantEvalThreadOverridesBody,
	): Promise<void> {
		await this.transport.request(`${this.evalBase}/threads/${threadId}/overrides`, {
			method: 'PUT',
			body: overrides satisfies AssistantEvalThreadOverridesBody,
		});
		this.overridesSent.add(threadId);
	}

	/**
	 * Queue a message. Resolves when the server accepted it. The turn runs on,
	 * and the wait loop follows it through the history route.
	 * POST /rest/agents/system/assistant/chat?projectId=<pid>
	 */
	async sendMessage(
		threadId: string,
		message: string,
		options: AssistantAgentMessageOptions = {},
	): Promise<void> {
		if (options.overrides && !this.overridesSent.has(threadId)) {
			await this.setThreadOverrides(threadId, options.overrides);
		}
		const projectId = this.projectByThread.get(threadId);
		const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
		const clientContext = {
			...(options.attachments?.length ? { attachments: options.attachments } : {}),
			...(options.context ? { context: options.context } : {}),
		};
		const first = await this.transport.postSseUntil(
			`${ASSISTANT_AGENT_BASE}/chat${query}`,
			{ message, sessionId: threadId, clientContext },
			(event) => ['message-queued', 'error', 'done'].includes(event.type),
		);
		throwOnSseError(first, 'Assistant chat failed');
	}

	/**
	 * Answer a suspended tool call. Resolves on the first event of the response.
	 * POST /rest/agents/system/assistant/chat/resume
	 */
	async resume(runId: string, toolCallId: string, resumeData: InstanceAiConfirmRequest) {
		const first = await this.transport.postSseUntil(
			`${ASSISTANT_AGENT_BASE}/chat/resume`,
			{ runId, toolCallId, resumeData },
			() => true,
		);
		throwOnSseError(first, 'Assistant resume failed');
	}

	/** GET /rest/agents/system/assistant/chat/:threadId/messages */
	async getHistory(threadId: string): Promise<AgentChatMessagesResponse> {
		return messagesResponseSchema.parse(
			unwrapData(await this.transport.request(`${ASSISTANT_AGENT_BASE}/chat/${threadId}/messages`)),
		);
	}

	/** GET /rest/agents/system/assistant/chat/:threadId/usage */
	async getUsage(threadId: string, timeoutMs?: number): Promise<AgentThreadUsageResponse> {
		return threadUsageResponseSchema.parse(
			unwrapData(
				await this.transport.request(`${ASSISTANT_AGENT_BASE}/chat/${threadId}/usage`, {
					timeoutMs,
				}),
			),
		);
	}

	/**
	 * Stop the running turn, if there is one.
	 * DELETE /rest/agents/system/assistant/chat/:threadId/executions/:executionId
	 */
	async cancel(threadId: string): Promise<void> {
		const { activeExecutionId } = await this.getHistory(threadId);
		if (!activeExecutionId) return;
		await this.transport.request(
			`${ASSISTANT_AGENT_BASE}/chat/${threadId}/executions/${activeExecutionId}`,
			{ method: 'DELETE' },
		);
	}
}

function throwOnSseError(event: AssistantSseEvent | undefined, prefix: string): void {
	// A stream that closes before the server confirms is not a success. The
	// caller retries, or the case fails, instead of grading an unanswered card.
	if (event === undefined) throw new Error(`${prefix}: the response ended before any event`);
	if (event.type !== 'error') return;
	const message = typeof event.message === 'string' ? event.message : 'unknown error';
	throw new Error(`${prefix}: ${message}`);
}

/** Read `data:` blocks from an SSE body. Returns the first event that `stop` accepts. */
export async function readSseUntil(
	body: ReadableStream<Uint8Array>,
	stop: (event: AssistantSseEvent) => boolean,
): Promise<AssistantSseEvent | undefined> {
	const reader = body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = '';
	while (true) {
		const { value, done } = await reader.read();
		if (done) return undefined;
		buffer += value;
		let end: number;
		while ((end = buffer.indexOf('\n\n')) !== -1) {
			const block = buffer.slice(0, end);
			buffer = buffer.slice(end + 2);
			const event = parseSseBlock(block);
			if (event && stop(event)) return event;
		}
	}
}

function parseSseBlock(block: string): AssistantSseEvent | undefined {
	const data = block
		.split('\n')
		.filter((line) => line.startsWith('data:'))
		.map((line) => line.slice(5).trim())
		.join('\n');
	if (!data) return undefined;
	try {
		const parsed: unknown = JSON.parse(data);
		if (!isRecord(parsed) || typeof parsed.type !== 'string') return undefined;
		return { ...parsed, type: parsed.type };
	} catch {
		return undefined;
	}
}
