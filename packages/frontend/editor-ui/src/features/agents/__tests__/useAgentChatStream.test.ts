/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, reactive, nextTick, effectScope, type Ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import {
	APPROVAL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
	WAIT_TOOL_NAME,
	type AgentChatMessagesResponse,
	type AgentSseEvent,
} from '@n8n/api-types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

const getAgentChatQueueMock = vi.fn().mockResolvedValue({ items: [] });
const removeAgentQueuedMessageMock = vi.fn().mockResolvedValue({ removed: true });
const updateAgentQueuedMessageMock = vi.fn();
const steerAgentQueuedMessageMock = vi.fn();
const getChatMessagesMock = vi.fn();
const getTestChatMessagesMock = vi.fn();
const cancelAgentChatRunMock = vi.fn();
const cancelAgentChatExecutionMock = vi.fn();

const pushListeners: Array<(event: unknown) => void> = [];
const pushConnectMock = vi.fn();
const connectionState = reactive({ isConnected: false });

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: pushConnectMock,
		get isConnected() {
			return connectionState.isConnected;
		},
		addEventListener: (handler: (event: unknown) => void) => {
			pushListeners.push(handler);
			return () => {
				const index = pushListeners.indexOf(handler);
				if (index >= 0) pushListeners.splice(index, 1);
			};
		},
	}),
}));

vi.mock('../composables/useAgentApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../composables/useAgentApi')>();
	return {
		...actual,
		getAgentChatQueue: (...args: unknown[]) => getAgentChatQueueMock(...args),
		removeAgentQueuedMessage: (...args: unknown[]) => removeAgentQueuedMessageMock(...args),
		updateAgentQueuedMessage: (...args: unknown[]) => updateAgentQueuedMessageMock(...args),
		steerAgentQueuedMessage: (...args: unknown[]) => steerAgentQueuedMessageMock(...args),
		getChatMessages: (...args: unknown[]) => getChatMessagesMock(...args),
		getTestChatMessages: (...args: unknown[]) => getTestChatMessagesMock(...args),
		cancelAgentChatRun: (...args: unknown[]) => cancelAgentChatRunMock(...args),
		cancelAgentChatExecution: (...args: unknown[]) => cancelAgentChatExecutionMock(...args),
	};
});

import { useAgentChatStream } from '../composables/useAgentChatStream';

// Runtime fixtures include the admission event sent before runtime output.
function withExecutionStart(events: AgentSseEvent[]): AgentSseEvent[] {
	if (
		events.length === 0 ||
		events.some(
			(event) =>
				event.type === 'execution-started' ||
				event.type === 'message-queued' ||
				(event.type === 'error' && event.errorCode === 'turn_already_running'),
		)
	)
		return events;
	const executionId =
		events.find((event) => event.type === 'done')?.executionId ?? crypto.randomUUID();
	return [{ type: 'execution-started', executionId, sessionId: 'thread-1' }, ...events];
}

/** Build a `Response` whose body streams the given events as SSE `data:` lines. */
function makeSseResponse(events: AgentSseEvent[], admitted = true): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const ev of admitted ? withExecutionStart(events) : events) {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
			}
			controller.close();
		},
	});
	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	});
}

function makeInterruptedSseResponse(events: AgentSseEvent[]): Response {
	const encoder = new TextEncoder();
	let eventsSent = false;
	const stream = new ReadableStream<Uint8Array>({
		pull(controller) {
			if (!eventsSent) {
				eventsSent = true;
				controller.enqueue(
					encoder.encode(
						withExecutionStart(events)
							.map((event) => `data: ${JSON.stringify(event)}\n\n`)
							.join(''),
					),
				);
				return;
			}
			controller.error(new Error('connection lost'));
		},
	});
	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	});
}

function makeAbortableSseResponse(events: AgentSseEvent[], signal: AbortSignal | null): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const event of withExecutionStart(events)) {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
			}
			signal?.addEventListener(
				'abort',
				() => controller.error(new DOMException('Aborted', 'AbortError')),
				{ once: true },
			);
		},
	});
	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	});
}

function makeControllableSseResponse(
	events: AgentSseEvent[],
	signal: AbortSignal | null,
): {
	response: Response;
	emit: (events: AgentSseEvent[]) => void;
	close: (finalEvents?: AgentSseEvent[]) => void;
} {
	const encoder = new TextEncoder();
	let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
	let settled = false;
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			streamController = controller;
			for (const event of withExecutionStart(events)) {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
			}
			signal?.addEventListener(
				'abort',
				() => {
					if (settled) return;
					settled = true;
					controller.error(new DOMException('Aborted', 'AbortError'));
				},
				{ once: true },
			);
		},
	});

	return {
		response: new Response(stream, {
			status: 200,
			headers: { 'Content-Type': 'text/event-stream' },
		}),
		emit: (events) => {
			for (const event of events)
				streamController?.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
		},
		close: (finalEvents = []) => {
			if (settled) return;
			settled = true;
			for (const event of finalEvents) {
				streamController?.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
			}
			streamController?.close();
		},
	};
}

beforeEach(() => {
	getChatMessagesMock.mockReset().mockRejectedValue({ httpStatusCode: 404 });
	getTestChatMessagesMock.mockReset().mockRejectedValue({ httpStatusCode: 404 });
	getAgentChatQueueMock.mockReset().mockResolvedValue({ items: [] });
	removeAgentQueuedMessageMock.mockReset().mockResolvedValue({ removed: true });
	steerAgentQueuedMessageMock.mockReset().mockResolvedValue(undefined);
});

const hookScopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
	for (const scope of hookScopes.splice(0)) scope.stop();
});

function buildHook(
	continueSessionId?: string,
	options: { newSession?: Ref<boolean>; onSessionCreated?: (sessionId: string) => void } = {},
) {
	const scope = effectScope();
	hookScopes.push(scope);
	return scope.run(() =>
		useAgentChatStream({
			projectId: ref('p1'),
			agentId: ref('a1'),
			...(continueSessionId ? { continueSessionId: ref(continueSessionId) } : {}),
			...options,
		}),
	)!;
}

describe('useAgentChatStream — SDK-aligned event handling', () => {
	let originalFetch: typeof fetch;
	let originalLocalStorage: typeof globalThis.localStorage | undefined;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		originalLocalStorage = globalThis.localStorage;
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => ''),
		});
		cancelAgentChatExecutionMock.mockReset();
		cancelAgentChatExecutionMock.mockResolvedValue({ cancelRequested: true });
		cancelAgentChatRunMock.mockReset();
		cancelAgentChatRunMock.mockResolvedValue({ cancelled: true });
		getTestChatMessagesMock.mockReset();
		getChatMessagesMock.mockImplementation(() => getTestChatMessagesMock());
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.stubGlobal('localStorage', originalLocalStorage);
		vi.restoreAllMocks();
	});

	it('renders nested approval while preserving delegated tool input', async () => {
		const delegateInput = {
			subAgentId: 'inline',
			taskName: 'research_api',
			goal: 'Research the requested API',
			context: 'Use the configured research agent',
		};
		const suspendPayload = {
			type: 'approval',
			toolName: 'http_request',
			args: { url: 'https://example.com/data' },
		};
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call',
				toolCallId: 'parent-tool-call-1',
				toolName: 'delegate_subagent',
				input: delegateInput,
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'parent-tool-call-1',
					runId: 'parent-run-1',
					toolName: 'delegate_subagent',
					input: suspendPayload,
				},
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('research this API');
		await flushPromises();
		await nextTick();

		const assistant = hook.messages.value[1];
		expect(assistant.status).toBe('awaitingUser');
		expect(assistant.toolCalls?.[0]).toMatchObject({
			input: delegateInput,
			suspendPayload,
			state: 'suspended',
			runId: 'parent-run-1',
		});
		expect(assistant.interactive).toEqual({
			toolCallId: 'parent-tool-call-1',
			toolName: APPROVAL_TOOL_NAME,
			input: suspendPayload,
			runId: 'parent-run-1',
		});
	});

	it('treats a suspension as a valid ending when the stream closes without done', async () => {
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call',
				toolCallId: 'tc-approval',
				toolName: 'calculator',
				input: { input: '2 + 2' },
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-approval',
					runId: 'run-approval',
					toolName: 'calculator',
					input: {
						type: 'approval',
						toolName: 'calculator',
						args: { input: '2 + 2' },
					},
				},
			},
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await flushPromises();
		await nextTick();

		const assistantMessages = hook.messages.value.filter((message) => message.role === 'assistant');
		expect(assistantMessages).toHaveLength(1);
		expect(assistantMessages[0].status).toBe('awaitingUser');
		expect(assistantMessages[0].toolCalls?.[0].state).toBe('suspended');
	});

	it('posts approval resumes to the chat resume endpoint in preview chat mode', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				makeSseResponse([
					{
						type: 'tool-call',
						toolCallId: 'tc-approval',
						toolName: 'calculator',
						input: { input: '2 + 2' },
					},
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tc-approval',
							runId: 'run-approval',
							toolName: 'calculator',
							input: {
								type: 'approval',
								toolName: 'calculator',
								args: { input: '2 + 2' },
							},
						},
					},
					{ type: 'done' },
				]),
			)
			.mockResolvedValueOnce(
				makeSseResponse([
					{
						type: 'tool-result',
						toolCallId: 'tc-approval',
						toolName: 'calculator',
						output: { result: 4 },
					},
					{ type: 'done' },
				]),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await flushPromises();
		await nextTick();

		await hook.resume({
			runId: 'run-approval',
			toolCallId: 'tc-approval',
			resumeData: { approved: true },
		});

		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			'http://localhost:5678/projects/p1/agents/v2/a1/chat/resume',
			expect.objectContaining({
				body: JSON.stringify({
					runId: 'run-approval',
					toolCallId: 'tc-approval',
					resumeData: { approved: true },
				}),
			}),
		);
		const assistant = hook.messages.value[1];
		expect(assistant.interactive?.resolvedValue).toEqual({ approved: true });
		expect(assistant.status).toBe('success');
	});

	it('cancels an open chat interaction before steering with a new message', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				makeSseResponse([
					{
						type: 'tool-call',
						toolCallId: 'tc-question',
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						input: {
							action: 'respond',
							input: {
								message: {
									card: {
										components: [{ type: 'button', label: 'Continue', value: 'continue' }],
									},
								},
							},
						},
					},
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tc-question',
							runId: 'run-question',
							toolName: N8N_CHAT_ACTION_TOOL_NAME,
							input: { type: 'integration_action' },
						},
					},
				]),
			)
			.mockResolvedValueOnce(makeSseResponse([{ type: 'done' }]));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('ask me a question');
		await flushPromises();
		await hook.cancelAndSteer('take another approach');

		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			'http://localhost:5678/projects/p1/agents/v2/a1/chat/resume',
			expect.objectContaining({
				body: JSON.stringify({
					runId: 'run-question',
					toolCallId: 'tc-question',
					resumeData: {
						_type: 'agent.cancellation',
						message: 'take another approach',
					},
				}),
			}),
		);
	});

	// An abandoned waiting card from an earlier turn must not become the steering
	// target: cancelling it would answer the wrong tool call and leave the
	// question the user is actually looking at open.
	it('steers the current turn question, not a waiting card left open earlier', async () => {
		const waitTurn = makeSseResponse([
			{
				type: 'tool-call',
				toolCallId: 'tc-wait',
				toolName: 'long_wait_workflow',
				input: {},
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-wait',
					runId: 'run-wait',
					toolName: 'long_wait_workflow',
					input: {
						type: 'workflow_wait',
						title: 'Waiting on "Long wait"',
						components: [{ type: 'button', label: 'Check for the result', value: 'continue' }],
					},
				},
			},
		]);
		const questionTurn = makeSseResponse([
			{
				type: 'tool-call',
				toolCallId: 'tc-question',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				input: {
					action: 'respond',
					input: {
						message: {
							card: { components: [{ type: 'button', label: 'Continue', value: 'continue' }] },
						},
					},
				},
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-question',
					runId: 'run-question',
					toolName: N8N_CHAT_ACTION_TOOL_NAME,
					input: { type: 'integration_action' },
				},
			},
		]);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(waitTurn)
			.mockResolvedValueOnce(questionTurn)
			.mockResolvedValueOnce(makeSseResponse([{ type: 'done' }]));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('start a long wait');
		await flushPromises();
		await hook.sendMessage('ask me a question');
		await flushPromises();
		await hook.cancelAndSteer('take another approach');

		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			'http://localhost:5678/projects/p1/agents/v2/a1/chat/resume',
			expect.objectContaining({
				body: expect.stringContaining('"toolCallId":"tc-question"'),
			}),
		);
		expect(fetchMock.mock.calls[2][1].body).not.toContain('tc-wait');
	});

	// Only the workflow, the card's own button, or Stop may end a wait. Steering it
	// would abandon the run and leave the sub-workflow finishing into nothing.
	it('refuses to steer a waiting card even when it is the current turn', async () => {
		const fetchMock = vi.fn().mockResolvedValueOnce(
			makeSseResponse([
				{
					type: 'tool-call',
					toolCallId: 'tc-wait',
					toolName: 'long_wait_workflow',
					input: {},
				},
				{
					type: 'tool-call-suspended',
					payload: {
						toolCallId: 'tc-wait',
						runId: 'run-wait',
						toolName: 'long_wait_workflow',
						input: {
							type: 'workflow_wait',
							title: 'Waiting on "Long wait"',
							components: [{ type: 'button', label: 'Check for the result', value: 'continue' }],
						},
					},
				},
			]),
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('start a long wait');
		await flushPromises();
		await hook.cancelAndSteer('never mind, do something else');

		// Only the original turn was sent — no resume, so the wait stays parked.
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const assistant = hook.messages.value[hook.messages.value.length - 1];
		expect(assistant.interactive?.resolvedAt).toBeUndefined();
		expect(assistant.interactive?.cancelled).toBeUndefined();
	});

	it('cancels an idle suspended interaction and settles its UI state', async () => {
		globalThis.fetch = vi.fn(async () =>
			makeSseResponse([
				{
					type: 'tool-call',
					toolCallId: 'tc-approval',
					toolName: 'calculator',
					input: { input: '2 + 2' },
				},
				{
					type: 'tool-call-suspended',
					payload: {
						toolCallId: 'tc-approval',
						runId: 'run-approval',
						toolName: 'calculator',
						input: {
							type: 'approval',
							toolName: 'calculator',
							args: { input: '2 + 2' },
						},
					},
				},
			]),
		) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await flushPromises();
		await hook.stopGenerating();

		expect(cancelAgentChatRunMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
			'run-approval',
		);
		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls?.[0]).toMatchObject({ state: 'cancelled', canceled: true });
		expect(assistant.interactive?.resolvedAt).toBeDefined();
		expect(assistant.status).toBe('success');
	});

	it('queues new messages while suspended-run cancellation is pending', async () => {
		const fetchMock = vi.fn(async () =>
			makeSseResponse([
				{
					type: 'tool-call',
					toolCallId: 'tc-external',
					toolName: 'external_action',
					input: { channel: 'external' },
				},
				{
					type: 'tool-call-suspended',
					payload: {
						toolCallId: 'tc-external',
						runId: 'run-external',
						toolName: 'external_action',
						input: { type: 'integration_action' },
					},
				},
			]),
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		let resolveCancellation = (_value: { cancelled: boolean }) => {};
		cancelAgentChatRunMock.mockReturnValue(
			new Promise((resolve) => {
				resolveCancellation = resolve;
			}),
		);

		const hook = buildHook();
		await hook.sendMessage('wait for external approval');
		await flushPromises();
		const stop = hook.stopGenerating();
		await vi.waitFor(() => expect(cancelAgentChatRunMock).toHaveBeenCalled());
		expect(hook.isCancelling.value).toBe(true);

		fetchMock.mockImplementationOnce(async () =>
			makeSseResponse([{ type: 'message-queued', queueId: '2', sessionId: 'thread-1' }], false),
		);
		await hook.sendMessage('start another run');
		await flushPromises();

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(hook.messages.value.some((message) => message.content === 'start another run')).toBe(
			false,
		);

		resolveCancellation({ cancelled: true });
		await stop;
		expect(hook.isCancelling.value).toBe(false);
	});

	it('reconciles history when suspended-run cancellation fails', async () => {
		const approvalInput = {
			type: 'approval' as const,
			toolName: 'calculator',
			args: { input: '2 + 2' },
		};
		let closeStream = () => {};
		globalThis.fetch = vi.fn(async (_url: string, init: RequestInit) => {
			const controlled = makeControllableSseResponse(
				[
					{
						type: 'tool-call',
						toolCallId: 'tc-approval',
						toolName: 'calculator',
						input: { input: '2 + 2' },
					},
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tc-approval',
							runId: 'run-approval',
							toolName: 'calculator',
							input: approvalInput,
						},
					},
				],
				init.signal ?? null,
			);
			closeStream = controlled.close;
			return controlled.response;
		}) as typeof fetch;
		cancelAgentChatRunMock.mockRejectedValue(new Error('request failed'));
		getTestChatMessagesMock.mockResolvedValue({
			messages: [
				{
					id: 'm1',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolName: 'calculator',
							toolCallId: 'tc-approval',
							input: approvalInput,
						},
					],
				},
			],
			openSuspensions: [{ toolCallId: 'tc-approval', runId: 'run-approval' }],
		});

		const hook = buildHook();
		const send = hook.sendMessage('calculate 2 + 2');
		let sendSettled = false;
		void send.then(() => {
			sendSettled = true;
		});
		await vi.waitFor(() => expect(hook.messages.value[1]?.status).toBe('awaitingUser'));
		try {
			hook.activeExecutionId.value = null;
			await hook.stopGenerating();
			await vi.waitFor(() => expect(sendSettled).toBe(true), { timeout: 250 });

			expect(getTestChatMessagesMock).toHaveBeenCalled();
			const assistant = hook.messages.value.at(-1)!;
			expect(assistant.status).toBe('awaitingUser');
			expect(assistant.toolCalls?.[0].state).toBe('suspended');
			expect(assistant.interactive?.runId).toBe('run-approval');
		} finally {
			closeStream();
			await send;
		}
	});

	it('keeps the open suspension when cancellation and history reconciliation fail', async () => {
		const approvalInput = {
			type: 'approval' as const,
			toolName: 'calculator',
			args: { input: '2 + 2' },
		};
		let closeStream = () => {};
		globalThis.fetch = vi.fn(async (_url: string, init: RequestInit) => {
			const controlled = makeControllableSseResponse(
				[
					{
						type: 'tool-call',
						toolCallId: 'tc-approval',
						toolName: 'calculator',
						input: { input: '2 + 2' },
					},
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tc-approval',
							runId: 'run-approval',
							toolName: 'calculator',
							input: approvalInput,
						},
					},
				],
				init.signal ?? null,
			);
			closeStream = controlled.close;
			return controlled.response;
		}) as typeof fetch;
		cancelAgentChatRunMock.mockRejectedValue(new Error('request failed'));
		getTestChatMessagesMock.mockRejectedValue(new Error('history unavailable'));

		const hook = buildHook();
		const send = hook.sendMessage('calculate 2 + 2');
		let sendSettled = false;
		void send.then(() => {
			sendSettled = true;
		});
		await vi.waitFor(() => expect(hook.messages.value[1]?.status).toBe('awaitingUser'));
		try {
			hook.activeExecutionId.value = null;
			await hook.stopGenerating();
			await vi.waitFor(() => expect(sendSettled).toBe(true), { timeout: 250 });

			const assistant = hook.messages.value[1];
			expect(assistant.status).toBe('awaitingUser');
			expect(assistant.toolCalls?.[0].state).toBe('suspended');
			expect(assistant.interactive?.runId).toBe('run-approval');
		} finally {
			closeStream();
			await send;
		}
	});

	it('cancels a suspended checkpoint when stopping before its stream closes', async () => {
		const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
			makeAbortableSseResponse(
				[
					{
						type: 'tool-call',
						toolCallId: 'tc-approval',
						toolName: 'calculator',
						input: { input: '2 + 2' },
					},
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tc-approval',
							runId: 'run-approval',
							toolName: 'calculator',
							input: {
								type: 'approval',
								toolName: 'calculator',
								args: { input: '2 + 2' },
							},
						},
					},
				],
				init.signal ?? null,
			),
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const hook = buildHook();
		const send = hook.sendMessage('calculate 2 + 2');
		await vi.waitFor(() => expect(hook.messages.value[1]?.toolCalls?.[0].state).toBe('suspended'));
		hook.activeExecutionId.value = null;
		await hook.stopGenerating();
		await send;

		expect(cancelAgentChatRunMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
			'run-approval',
		);
		expect(hook.messages.value[1].toolCalls?.[0].state).toBe('cancelled');
	});

	it('settles an active non-card suspension and its parallel tool calls', async () => {
		globalThis.fetch = vi.fn(async (_url: string, init: RequestInit) =>
			makeAbortableSseResponse(
				[
					{
						type: 'tool-call',
						toolCallId: 'tc-external',
						toolName: 'external_action',
						input: { channel: 'external' },
					},
					{
						type: 'tool-call',
						toolCallId: 'tc-parallel',
						toolName: 'slow_action',
						input: {},
					},
					{
						type: 'tool-execution-start',
						toolCallId: 'tc-parallel',
						toolName: 'slow_action',
						startTime: 1_000,
					},
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tc-external',
							runId: 'run-external',
							toolName: 'external_action',
							input: { type: 'integration_action' },
						},
					},
				],
				init.signal ?? null,
			),
		) as typeof fetch;

		const hook = buildHook();
		const send = hook.sendMessage('wait for external approval');
		await vi.waitFor(() => expect(hook.messages.value[1]?.toolCalls?.[0].state).toBe('suspended'));
		hook.activeExecutionId.value = null;
		await hook.stopGenerating();
		await send;

		expect(cancelAgentChatRunMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
			'run-external',
		);
		expect(hook.messages.value[1].status).toBe('success');
		expect(hook.messages.value[1].toolCalls).toEqual([
			expect.objectContaining({
				toolCallId: 'tc-external',
				state: 'cancelled',
				canceled: true,
			}),
			expect.objectContaining({
				toolCallId: 'tc-parallel',
				state: 'cancelled',
				canceled: true,
			}),
		]);
	});

	it('settles every suspended tool call belonging to a cancelled run', async () => {
		globalThis.fetch = vi.fn(async () =>
			makeSseResponse([
				{
					type: 'tool-call',
					toolCallId: 'tc-first',
					toolName: 'external_action',
					input: { value: 'first' },
				},
				{
					type: 'tool-call',
					toolCallId: 'tc-second',
					toolName: 'external_action',
					input: { value: 'second' },
				},
				{
					type: 'tool-call-suspended',
					payload: {
						toolCallId: 'tc-first',
						runId: 'run-parallel',
						toolName: 'external_action',
						input: { type: 'integration_action' },
					},
				},
				{
					type: 'tool-call-suspended',
					payload: {
						toolCallId: 'tc-second',
						runId: 'run-parallel',
						toolName: 'external_action',
						input: { type: 'integration_action' },
					},
				},
			]),
		) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('wait for both actions');
		await flushPromises();
		await hook.stopGenerating();

		expect(hook.messages.value[1].toolCalls).toEqual([
			expect.objectContaining({ toolCallId: 'tc-first', state: 'cancelled', canceled: true }),
			expect.objectContaining({ toolCallId: 'tc-second', state: 'cancelled', canceled: true }),
		]);
	});

	it('does not reopen a submitted HITL card when its resumed stream is stopped', async () => {
		let closeResume = () => {};
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				makeSseResponse([
					{
						type: 'tool-call',
						toolCallId: 'tc-approval',
						toolName: 'calculator',
						input: { input: '2 + 2' },
					},
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tc-approval',
							runId: 'run-approval',
							toolName: 'calculator',
							input: {
								type: 'approval',
								toolName: 'calculator',
								args: { input: '2 + 2' },
							},
						},
					},
				]),
			)
			.mockImplementationOnce(async (_url: string, init: RequestInit) => {
				const controlled = makeControllableSseResponse(
					[{ type: 'execution-started', executionId: 'resumed-execution', sessionId: 'thread-1' }],
					init.signal ?? null,
				);
				closeResume = controlled.close;
				return controlled.response;
			});
		cancelAgentChatExecutionMock.mockImplementation(async () => {
			closeResume();
			return { cancelRequested: true };
		});
		getChatMessagesMock.mockRejectedValue(new Error('history unavailable'));

		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await flushPromises();
		const resume = hook.resume({
			runId: 'run-approval',
			toolCallId: 'tc-approval',
			resumeData: { approved: false },
		});
		await vi.waitFor(() => expect(hook.activeExecutionId.value).toBe('resumed-execution'));
		await hook.stopGenerating();
		await resume;

		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls?.[0].state).toBe('done');
		expect(assistant.interactive?.resolvedAt).toBeDefined();
		expect(assistant.status).toBe('success');
	});

	it('reopens a cancelled HITL card when backend cleanup re-suspends it', async () => {
		const approvalInput = {
			type: 'approval' as const,
			toolName: 'calculator',
			args: { input: '2 + 2' },
		};
		const suspensionEvent: AgentSseEvent = {
			type: 'tool-call-suspended',
			payload: {
				toolCallId: 'tc-approval',
				runId: 'run-approval',
				toolName: 'calculator',
				input: approvalInput,
			},
		};
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				makeSseResponse([
					{
						type: 'tool-call',
						toolCallId: 'tc-approval',
						toolName: 'calculator',
						input: { input: '2 + 2' },
					},
					suspensionEvent,
				]),
			)
			.mockResolvedValueOnce(makeSseResponse([suspensionEvent]));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await flushPromises();
		await hook.resume({
			runId: 'run-approval',
			toolCallId: 'tc-approval',
			cancelled: true,
			text: 'Keep waiting',
		});

		const assistant = hook.messages.value[1];
		expect(assistant.status).toBe('awaitingUser');
		expect(assistant.toolCalls?.[0]).toMatchObject({
			state: 'suspended',
			canceled: false,
			output: undefined,
			displaySummary: undefined,
		});
		expect(assistant.interactive).toMatchObject({
			toolCallId: 'tc-approval',
			runId: 'run-approval',
		});
		expect(assistant.interactive?.cancelled).toBeUndefined();
		expect(assistant.interactive?.resolvedAt).toBeUndefined();
	});

	it('reconciles a failed resume against the backend suspension state', async () => {
		const approvalInput = {
			type: 'approval' as const,
			toolName: 'calculator',
			args: { input: '2 + 2' },
		};
		globalThis.fetch = vi
			.fn()
			.mockResolvedValueOnce(
				makeSseResponse([
					{
						type: 'tool-call',
						toolCallId: 'tc-approval',
						toolName: 'calculator',
						input: { input: '2 + 2' },
					},
					{
						type: 'tool-call-suspended',
						payload: {
							toolCallId: 'tc-approval',
							runId: 'run-approval',
							toolName: 'calculator',
							input: approvalInput,
						},
					},
				]),
			)
			.mockResolvedValueOnce(
				makeSseResponse([{ type: 'error', message: 'This action has already been handled' }]),
			) as unknown as typeof fetch;
		getTestChatMessagesMock.mockResolvedValue({
			messages: [
				{
					id: 'm1',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolName: 'calculator',
							toolCallId: 'tc-approval',
							input: approvalInput,
						},
					],
				},
			],
			openSuspensions: [],
		});

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await flushPromises();
		await hook.resume({
			runId: 'run-approval',
			toolCallId: 'tc-approval',
			resumeData: { approved: false },
		});

		expect(getTestChatMessagesMock).toHaveBeenCalled();
		const assistant = hook.messages.value[0];
		expect(assistant.interactive).toBeUndefined();
		expect(assistant.toolCalls?.[0].state).toBe('cancelled');
	});

	it.each([
		['failed', makeSseResponse, undefined],
		['interrupted', makeInterruptedSseResponse, undefined],
		['busy', makeSseResponse, 'turn_already_running'],
	] as const)(
		'keeps the suspended card after a %s resume and failed refresh',
		async (_outcome, response, errorCode) => {
			const approvalInput = {
				type: 'approval' as const,
				toolName: 'calculator',
				args: { input: '2 + 2' },
			};
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce(
					makeSseResponse([
						{
							type: 'tool-call',
							toolCallId: 'tc-approval',
							toolName: 'calculator',
							input: { input: '2 + 2' },
						},
						{
							type: 'tool-call-suspended',
							payload: {
								toolCallId: 'tc-approval',
								runId: 'run-approval',
								toolName: 'calculator',
								input: approvalInput,
							},
						},
					]),
				)
				.mockResolvedValueOnce(
					response([
						{
							type: 'error',
							message: 'Resume failed',
							...(errorCode ? { errorCode } : {}),
						},
					]),
				) as unknown as typeof fetch;
			getTestChatMessagesMock.mockRejectedValue(
				Object.assign(new Error('thread not found'), { httpStatusCode: 404 }),
			);

			const hook = buildHook();
			await hook.sendMessage('calculate 2 + 2');
			await flushPromises();
			const result = await hook.resume({
				runId: 'run-approval',
				toolCallId: 'tc-approval',
				resumeData: { approved: false },
			});

			expect(result).toBe(errorCode ? 'busy' : 'sent');
			expect(getTestChatMessagesMock).toHaveBeenCalled();
			expect(hook.messages.value[0].content).toBe('calculate 2 + 2');
			const assistant = hook.messages.value[1];
			expect(assistant.status).toBe('awaitingUser');
			expect(assistant.toolCalls?.[0].state).toBe('suspended');
			expect(assistant.interactive?.resolvedAt).toBeUndefined();
		},
	);

	it('breaks out of the consume loop on `done` so isStreaming flips back to false', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'text-delta', id: 't-1', delta: 'hello' },
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('hi');
		await flushPromises();
		await nextTick();

		expect(hook.isStreaming.value).toBe(false);
	});

	it('collects streamed reasoning as a timed segment', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'reasoning-start', id: 'reasoning-1' },
			{ type: 'reasoning-delta', id: 'reasoning-1', delta: 'Check the inputs. ' },
			{ type: 'reasoning-delta', id: 'reasoning-1', delta: 'Then answer.' },
			{ type: 'reasoning-end', id: 'reasoning-1' },
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('think about this');
		await flushPromises();
		await nextTick();

		const assistant = hook.messages.value[1];
		expect(assistant.thinkingSegments).toEqual([
			{
				id: 'reasoning-1',
				content: 'Check the inputs. Then answer.',
				startTime: expect.any(Number),
				endTime: expect.any(Number),
			},
		]);
	});

	it('preserves active messages and tool calls when the stream closes prematurely', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				input: { query: 'n8n' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				startTime: 1_000,
			},
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('look this up');
		await flushPromises();
		await nextTick();

		const assistantMessages = hook.messages.value.filter((message) => message.role === 'assistant');
		expect(assistantMessages).toHaveLength(1);
		expect(assistantMessages[0].status).toBe('streaming');
		expect(assistantMessages[0].toolCalls?.[0].state).toBe('running');
		expect(hook.isStreaming.value).toBe(true);
		expect(getTestChatMessagesMock).toHaveBeenCalled();
	});

	it('preserves active messages and tool calls when reading the stream throws', async () => {
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				input: { query: 'n8n' },
			},
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				startTime: 1_000,
			},
		];
		globalThis.fetch = vi.fn(async () => makeInterruptedSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('look this up');
		await flushPromises();
		await nextTick();

		const assistantMessages = hook.messages.value.filter((message) => message.role === 'assistant');
		expect(assistantMessages).toHaveLength(1);
		expect(assistantMessages[0].status).toBe('streaming');
		expect(assistantMessages[0].toolCalls?.[0].state).toBe('running');
		expect(hook.isStreaming.value).toBe(true);
		expect(getTestChatMessagesMock).toHaveBeenCalled();
	});

	it('preserves partial reasoning when the stream closes prematurely', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'reasoning-start', id: 'r-1' },
			{ type: 'reasoning-delta', id: 'r-1', delta: 'Checking the workflow' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('inspect this');
		await flushPromises();
		await nextTick();

		const assistantMessages = hook.messages.value.filter((message) => message.role === 'assistant');
		expect(assistantMessages).toHaveLength(1);
		expect(assistantMessages[0]).toMatchObject({
			thinking: 'Checking the workflow',
			thinkingSegments: [
				expect.objectContaining({
					id: 'r-1',
					content: 'Checking the workflow',
					startTime: expect.any(Number),
				}),
			],
			status: 'streaming',
		});
		expect(hook.isStreaming.value).toBe(true);
	});

	it('opens a fresh ChatMessage after finish-step / start-step iteration boundary', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{ type: 'text-delta', id: 't-1', delta: 'first turn' },
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				input: { q: 'x' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-result',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				output: { hit: true },
			},
			{ type: 'start-step' },
			{ type: 'text-delta', id: 't-2', delta: 'second turn' },
			{ type: 'finish-step' },
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('hello');
		await flushPromises();
		await nextTick();

		// 1 user + 2 assistant ChatMessages (one per start-step / finish-step pair)
		expect(hook.messages.value).toHaveLength(3);
		const first = hook.messages.value[1];
		const second = hook.messages.value[2];
		expect(first.content).toBe('first turn');
		expect(first.toolCalls?.[0].toolCallId).toBe('tc-1');
		expect(first.toolCalls?.[0].state).toBe('done');
		expect(first.toolCalls?.[0].output).toEqual({ hit: true });
		expect(second.content).toBe('second turn');
	});

	it('attaches tool-call-suspended to the existing ToolCall after a closed iteration (no duplicate)', async () => {
		// Real BE event order for a suspended interactive tool: the tool-call
		// is streamed inside one LLM iteration that closes with `finish-step`,
		// then `tool-execution-start` fires from the runtime event bus, and
		// finally `tool-call-suspended` arrives — by which time the cursor has
		// been cleared. The suspended event must update the existing ToolCall
		// in place, not push a duplicate into a freshly-minted ChatMessage.
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{ type: 'tool-input-start', toolCallId: 'tc-1', toolName: 'calculator' },
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: 'calculator',
				input: { input: '2 + 2' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-1',
				toolName: 'calculator',
				startTime: 1_000,
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					runId: 'run-9',
					toolName: 'calculator',
					input: { type: 'approval', toolName: 'calculator', args: { input: '2 + 2' } },
				},
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('build me an agent');
		await flushPromises();
		await nextTick();

		// 1 user + exactly 1 assistant ChatMessage — no duplicate spawned by
		// the post-finish-step suspension event.
		expect(hook.messages.value).toHaveLength(2);
		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls).toHaveLength(1);
		expect(assistant.toolCalls?.[0].toolCallId).toBe('tc-1');
		expect(assistant.toolCalls?.[0].state).toBe('suspended');
		expect(assistant.interactive?.runId).toBe('run-9');
		expect(assistant.status).toBe('awaitingUser');
	});

	// -----------------------------------------------------------------------
	// Error event handling
	// -----------------------------------------------------------------------

	it('pushes a new error bubble for non-misconfigured errors', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'error', message: 'Tool execution failed', errorCode: 'tool_error' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('run');
		await flushPromises();
		await nextTick();

		// 1 user message + 1 error bubble
		expect(hook.messages.value).toHaveLength(2);
		const errMsg = hook.messages.value[1];
		expect(errMsg.role).toBe('assistant');
		expect(errMsg.status).toBe('error');
		expect(errMsg.content).toBe('Tool execution failed');
	});

	it('collects non-fatal warning events without aborting the run', async () => {
		const events: AgentSseEvent[] = [
			{
				type: 'warning',
				message: 'fetch failed',
				code: 'mcp_connection_failed',
				source: 'mcp',
				server: 'dead',
			},
			{ type: 'text-delta', id: 't-1', delta: 'hello' },
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('run');
		await flushPromises();
		await nextTick();

		expect(hook.warnings.value).toEqual([
			{ message: 'fetch failed', code: 'mcp_connection_failed', server: 'dead' },
		]);
		// The run still produced its assistant text — warnings are non-fatal.
		expect(hook.messages.value[1].content).toBe('hello');
	});

	it('clears prior warnings on the next send', async () => {
		const withWarning: AgentSseEvent[] = [
			{ type: 'warning', message: 'boom', source: 'mcp', server: 'dead' },
			{ type: 'done' },
		];
		const withoutWarning: AgentSseEvent[] = [{ type: 'done' }];
		globalThis.fetch = vi.fn(async () => makeSseResponse(withWarning)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('run');
		await flushPromises();
		await nextTick();
		expect(hook.warnings.value).toHaveLength(1);

		globalThis.fetch = vi.fn(async () => makeSseResponse(withoutWarning)) as typeof fetch;
		await hook.sendMessage('run again');
		await flushPromises();
		await nextTick();
		expect(hook.warnings.value).toHaveLength(0);
	});

	it('dismissWarning removes a single warning by index', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'warning', message: 'a', source: 'mcp', server: 's1' },
			{ type: 'warning', message: 'b', source: 'mcp', server: 's2' },
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('run');
		await flushPromises();
		await nextTick();
		expect(hook.warnings.value).toHaveLength(2);

		hook.dismissWarning(0);
		expect(hook.warnings.value.map((w) => w.server)).toEqual(['s2']);
	});

	it('keeps a dismissed warning hidden until a new chat composable is created', async () => {
		const events: AgentSseEvent[] = [
			{
				type: 'warning',
				message: 'Invalid access token',
				code: 'mcp_connection_failed',
				source: 'mcp',
				server: 'Linear',
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('run');
		await flushPromises();
		hook.dismissWarning(0);

		await hook.sendMessage('run again');
		await flushPromises();

		expect(hook.warnings.value).toHaveLength(0);

		const refreshedHook = buildHook();
		await refreshedHook.sendMessage('run');

		expect(refreshedHook.warnings.value).toEqual([
			{
				message: 'Invalid access token',
				code: 'mcp_connection_failed',
				server: 'Linear',
			},
		]);
	});

	it('still shows a different warning after another warning is dismissed', async () => {
		const firstEvents: AgentSseEvent[] = [
			{ type: 'warning', message: 'Invalid access token', source: 'mcp', server: 'Linear' },
			{ type: 'done' },
		];
		const secondEvents: AgentSseEvent[] = [
			{ type: 'warning', message: 'Connection timed out', source: 'mcp', server: 'Linear' },
			{ type: 'done' },
		];
		globalThis.fetch = vi
			.fn()
			.mockResolvedValueOnce(makeSseResponse(firstEvents))
			.mockResolvedValueOnce(makeSseResponse(secondEvents)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('run');
		await flushPromises();
		hook.dismissWarning(0);

		await hook.sendMessage('run again');
		await flushPromises();

		expect(hook.warnings.value).toEqual([{ message: 'Connection timed out', server: 'Linear' }]);
	});

	it('sets fatalError (not a message bubble) for agent_misconfigured errors', async () => {
		const events: AgentSseEvent[] = [
			{
				type: 'error',
				message: 'Model is not configured',
				errorCode: 'agent_misconfigured',
				missing: ['model'],
			},
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('run');
		await flushPromises();
		await nextTick();

		// Only user message — no inline error bubble
		expect(hook.messages.value).toHaveLength(1);
		expect(hook.fatalError.value).toEqual({
			message: 'Model is not configured',
			missing: ['model'],
		});
	});

	it('drops empty orphan minted bubbles when any error arrives', async () => {
		const events: AgentSseEvent[] = [
			// start-step mints a ChatMessage but no text/tool follows — it stays empty
			{ type: 'start-step' },
			{ type: 'error', message: 'Stream died', errorCode: 'stream_error' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('hello');
		await flushPromises();
		await nextTick();

		// user message + 1 error bubble (the orphan empty one must be gone)
		const assistantMsgs = hook.messages.value.filter((m) => m.role === 'assistant');
		expect(assistantMsgs).toHaveLength(1);
		expect(assistantMsgs[0].status).toBe('error');
		expect(assistantMsgs[0].content).toBe('Stream died');
	});

	it('keeps minted bubbles that have content when an error arrives', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{ type: 'text-delta', id: 't-1', delta: 'partial answer' },
			{ type: 'finish-step' },
			{ type: 'error', message: 'Downstream failure', errorCode: 'runtime_error' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('tell me');
		await flushPromises();
		await nextTick();

		// user + bubble with 'partial answer' (preserved) + error bubble
		const assistantMsgs = hook.messages.value.filter((m) => m.role === 'assistant');
		expect(assistantMsgs).toHaveLength(2);
		expect(assistantMsgs[0].content).toBe('partial answer');
		expect(assistantMsgs[1].status).toBe('error');
	});

	it('keeps partial reasoning when an error arrives', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'reasoning-start', id: 'reasoning-1' },
			{ type: 'reasoning-delta', id: 'reasoning-1', delta: 'Partial analysis' },
			{ type: 'error', message: 'Downstream failure', errorCode: 'runtime_error' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('tell me');
		await flushPromises();
		await nextTick();

		const assistantMsgs = hook.messages.value.filter((message) => message.role === 'assistant');
		expect(assistantMsgs).toHaveLength(2);
		expect(assistantMsgs[0].thinkingSegments?.[0]).toEqual(
			expect.objectContaining({
				id: 'reasoning-1',
				content: 'Partial analysis',
				endTime: expect.any(Number),
			}),
		);
		expect(assistantMsgs[1].status).toBe('error');
	});

	it('keeps minted bubbles that have tool calls when an error arrives', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: {} },
			{ type: 'finish-step' },
			{ type: 'error', message: 'Crashed after tool call', errorCode: 'runtime_error' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('search');
		await flushPromises();
		await nextTick();

		// user + bubble with tool call (preserved) + error bubble
		const assistantMsgs = hook.messages.value.filter((m) => m.role === 'assistant');
		expect(assistantMsgs).toHaveLength(2);
		expect(assistantMsgs[0].toolCalls).toHaveLength(1);
		expect(assistantMsgs[1].status).toBe('error');
	});

	it('marks in-flight messages and tool calls as failed when an error event arrives', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: {} },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				startTime: 1_000,
			},
			{ type: 'error', message: 'Tool failed', errorCode: 'runtime_error' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('search');
		await flushPromises();
		await nextTick();

		const assistantMsgs = hook.messages.value.filter((message) => message.role === 'assistant');
		expect(assistantMsgs[0].status).toBe('error');
		expect(assistantMsgs[0].toolCalls?.[0].state).toBe('error');
		expect(assistantMsgs[1]).toMatchObject({ content: 'Tool failed', status: 'error' });
	});

	it('retires a suspended interaction when its run emits an error', async () => {
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call',
				toolCallId: 'tc-approval',
				toolName: 'calculator',
				input: { input: '2 + 2' },
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-approval',
					runId: 'run-approval',
					toolName: 'calculator',
					input: {
						type: 'approval',
						toolName: 'calculator',
						args: { input: '2 + 2' },
					},
				},
			},
			{ type: 'error', message: 'Run failed', errorCode: 'runtime_error' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await flushPromises();

		const assistant = hook.messages.value[1];
		expect(assistant.status).toBe('error');
		expect(assistant.toolCalls?.[0].state).toBe('error');
		expect(assistant.interactive).toBeUndefined();
	});

	it('flips a ToolCall from pending → running on tool-execution-start, then to done on tool-result', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-9',
				toolName: 'compute',
				input: {},
			},
			{ type: 'finish-step' },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-9',
				toolName: 'compute',
				startTime: 1_000,
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-9',
				toolName: 'compute',
				output: 42,
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('do thing');
		await flushPromises();
		await nextTick();

		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls?.[0].state).toBe('done');
		expect(assistant.toolCalls?.[0].output).toBe(42);
	});

	it('marks cancellation tool results as cancelled instead of done', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-cancel',
				toolName: 'delete_file',
				input: { path: '/tmp/a.txt' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-result',
				toolCallId: 'tc-cancel',
				toolName: 'delete_file',
				output: 'The tool call was cancelled',
				canceled: true,
			} as AgentSseEvent,
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('delete file');
		await flushPromises();
		await nextTick();

		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls?.[0].state).toBe('cancelled');
		expect(assistant.toolCalls?.[0].output).toBe('The tool call was cancelled');
		expect(assistant.toolCalls?.[0].canceled).toBe(true);
	});

	it('flips a ToolCall to done on tool-execution-end before the batched tool-result arrives', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-11',
				toolName: 'delegate_subagent',
				input: { subAgentId: 'inline' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-11',
				toolName: 'delegate_subagent',
				startTime: 1_000,
			},
			{
				type: 'tool-execution-end',
				toolCallId: 'tc-11',
				toolName: 'delegate_subagent',
				isError: false,
				endTime: 1_500,
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('do thing');
		await flushPromises();
		await nextTick();

		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls?.[0].state).toBe('done');
	});

	it('renders a failed delegate_subagent result as an error step even though the call resolves', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-d1',
				toolName: 'delegate_subagent',
				input: { subAgentId: 'inline', taskName: 'research' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-result',
				toolCallId: 'tc-d1',
				toolName: 'delegate_subagent',
				output: { status: 'failed', answer: '', error: 'child failed' },
				isError: false,
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('go');
		await flushPromises();
		await nextTick();

		expect(hook.messages.value[1].toolCalls?.[0].state).toBe('error');
	});

	it('renders a completed delegate_subagent result as a done step', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-d2',
				toolName: 'delegate_subagent',
				input: { subAgentId: 'inline' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-result',
				toolCallId: 'tc-d2',
				toolName: 'delegate_subagent',
				output: { status: 'completed', answer: 'all good' },
				isError: false,
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('go');
		await flushPromises();
		await nextTick();

		expect(hook.messages.value[1].toolCalls?.[0].state).toBe('done');
	});

	it('stores the server-stamped startTime/endTime verbatim (no client clock)', async () => {
		// The FE must not compute timing itself — it stores the backend-measured
		// timestamps off the lifecycle events so the live duration equals the
		// persisted/reloaded one exactly.
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-12',
				toolName: 'delegate_subagent',
				input: { subAgentId: 'inline' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-12',
				toolName: 'delegate_subagent',
				startTime: 1_000,
			},
			{
				type: 'tool-execution-end',
				toolCallId: 'tc-12',
				toolName: 'delegate_subagent',
				isError: false,
				endTime: 1_014,
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('do thing');
		await flushPromises();
		await nextTick();

		const tc = hook.messages.value[1].toolCalls?.[0];
		expect(tc?.startTime).toBe(1_000);
		expect(tc?.endTime).toBe(1_014);
	});

	it('preserves tool input and stores the suspend payload for integration actions', async () => {
		const cardInput = {
			action: 'respond',
			input: { message: { card: { components: [{ type: 'button', value: 'yes' }] } } },
		};
		const sidecar = {
			type: 'integration_action',
			action: 'respond',
			integrationConnectionId: 'n8n_chat',
			messageContext: null,
		};
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				input: cardInput,
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					runId: 'run-1',
					toolName: N8N_CHAT_ACTION_TOOL_NAME,
					input: sidecar,
				},
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('hello');
		await flushPromises();
		await nextTick();

		const msg = hook.messages.value.at(-1)!;
		const tc = msg.toolCalls!.find((t) => t.toolCallId === 'tc-1')!;
		expect(tc.input).toEqual(cardInput); // NOT clobbered by the sidecar
		expect(tc.suspendPayload).toEqual(sidecar);
		expect(tc.state).toBe('suspended');
		expect(msg.interactive?.toolName).toBe(N8N_CHAT_ACTION_TOOL_NAME);
		expect(msg.interactive?.runId).toBe('run-1');
		expect(msg.status).toBe('awaitingUser');
	});

	it('renders a resolved display-only n8n_chat card when its tool result arrives', async () => {
		// Display-only cards (no interactive components) never suspend — the
		// card must still attach to the message when the tool resolves.
		const cardInput = {
			action: 'respond',
			input: {
				message: {
					text: 'Snapshot:',
					card: {
						title: 'Account Snapshot',
						components: [{ type: 'fields', fields: [{ label: 'ARR', value: '$1m' }] }],
					},
				},
			},
		};
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call',
				toolCallId: 'tc-2',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				input: cardInput,
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-2',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				output: { ok: true },
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('show me a snapshot');
		await flushPromises();
		await nextTick();

		const msg = hook.messages.value.at(-1)!;
		expect(msg.interactive?.toolName).toBe(N8N_CHAT_ACTION_TOOL_NAME);
		expect(msg.interactive?.resolvedAt).toBeDefined();
		expect(msg.status).not.toBe('awaitingUser');
	});

	it('keeps multiple resolved n8n_chat cards from one streamed assistant message', async () => {
		const firstCardInput = {
			action: 'respond',
			input: {
				message: {
					card: {
						title: 'First card',
						components: [{ type: 'fields', fields: [{ label: 'Status', value: 'Ready' }] }],
					},
				},
			},
		};
		const secondCardInput = {
			action: 'respond',
			input: {
				message: {
					card: {
						title: 'Second card',
						components: [{ type: 'fields', fields: [{ label: 'Owner', value: 'Sales' }] }],
					},
				},
			},
		};
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call',
				toolCallId: 'tc-card-1',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				input: firstCardInput,
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-card-1',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				output: { ok: true },
			},
			{
				type: 'tool-call',
				toolCallId: 'tc-card-2',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				input: secondCardInput,
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-card-2',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				output: { ok: true },
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('show two cards');
		await flushPromises();
		await nextTick();

		const msg = hook.messages.value.at(-1)!;
		expect(msg.toolCalls?.map((tc) => tc.toolCallId)).toEqual(['tc-card-1', 'tc-card-2']);
		expect(msg.interactives?.map((payload) => payload.toolCallId)).toEqual([
			'tc-card-1',
			'tc-card-2',
		]);
		expect(
			msg.interactives?.every((payload) => payload.toolName === N8N_CHAT_ACTION_TOOL_NAME),
		).toBe(true);
	});

	it('keeps the assistant message awaiting while another card in the same message is still open', async () => {
		const firstCardInput = {
			action: 'respond',
			input: {
				message: {
					card: {
						components: [{ type: 'button', label: 'Yes', value: 'yes' }],
					},
				},
			},
		};
		const secondCardInput = {
			action: 'respond',
			input: {
				message: {
					card: {
						components: [{ type: 'button', label: 'No', value: 'no' }],
					},
				},
			},
		};
		const sidecar = {
			type: 'integration_action',
			action: 'respond',
			integrationConnectionId: 'n8n_chat',
			messageContext: null,
		};
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call',
				toolCallId: 'tc-card-1',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				input: firstCardInput,
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-card-1',
					runId: 'run-card-1',
					toolName: N8N_CHAT_ACTION_TOOL_NAME,
					input: sidecar,
				},
			},
			{
				type: 'tool-call',
				toolCallId: 'tc-card-2',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				input: secondCardInput,
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-card-2',
					runId: 'run-card-2',
					toolName: N8N_CHAT_ACTION_TOOL_NAME,
					input: sidecar,
				},
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-card-1',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				output: { type: 'button', value: 'yes' },
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('show two choices');
		await flushPromises();
		await nextTick();

		const msg = hook.messages.value.at(-1)!;
		expect(msg.status).toBe('awaitingUser');
		expect(
			msg.interactives?.find((payload) => payload.toolCallId === 'tc-card-1')?.resolvedAt,
		).toBe(1);
		expect(
			msg.interactives?.find((payload) => payload.toolCallId === 'tc-card-2')?.resolvedAt,
		).toBeUndefined();
	});
});

describe('useAgentChatStream — loadHistory', () => {
	let originalFetch: typeof fetch;
	let originalLocalStorage: typeof globalThis.localStorage | undefined;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		originalLocalStorage = globalThis.localStorage;
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => ''),
		});
		getChatMessagesMock.mockReset();
		getTestChatMessagesMock.mockReset();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.stubGlobal('localStorage', originalLocalStorage);
		vi.restoreAllMocks();
	});

	it('re-arms a suspended n8n_chat_action card from the chat history sidecar', async () => {
		const cardInput = {
			action: 'respond',
			input: { message: { card: { components: [{ type: 'button', value: 'ok' }] } } },
		};
		getTestChatMessagesMock.mockResolvedValue({
			messages: [
				{
					id: 'm1',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolName: N8N_CHAT_ACTION_TOOL_NAME,
							toolCallId: 'tc-1',
							input: cardInput,
							state: 'pending',
						},
					],
				},
			],
			openSuspensions: [{ toolCallId: 'tc-1', runId: 'run-9' }],
		});

		// loadHistory uses getTestChatMessages when no continue session id is set
		const hook = buildHook();
		await hook.loadHistory();

		const msg = hook.messages.value.at(-1)!;
		expect(msg.interactive?.toolName).toBe(N8N_CHAT_ACTION_TOOL_NAME);
		expect(msg.interactive?.runId).toBe('run-9');
		expect(msg.status).toBe('awaitingUser');
	});

	it('re-arms a suspended n8n_chat_action card from continued session history', async () => {
		const cardInput = {
			action: 'respond',
			input: { message: { card: { components: [{ type: 'button', value: 'approve' }] } } },
		};
		getChatMessagesMock.mockResolvedValue({
			messages: [
				{
					id: 'm1',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolName: N8N_CHAT_ACTION_TOOL_NAME,
							toolCallId: 'tc-continued',
							input: cardInput,
							state: 'pending',
						},
					],
				},
			],
			openSuspensions: [{ toolCallId: 'tc-continued', runId: 'run-continued' }],
		});

		const hook = buildHook('thread-1');
		await hook.loadHistory();

		expect(getChatMessagesMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
			'thread-1',
		);
		const msg = hook.messages.value.at(-1)!;
		expect(msg.interactive?.toolName).toBe(N8N_CHAT_ACTION_TOOL_NAME);
		expect(msg.interactive?.runId).toBe('run-continued');
		expect(msg.status).toBe('awaitingUser');
	});

	it('marks a client-minted session as created when persisted history exists', async () => {
		getChatMessagesMock.mockResolvedValue({ messages: [], openSuspensions: [] });
		const newSession = ref(true);
		const onSessionCreated = vi.fn(() => {
			newSession.value = false;
		});
		const hook = buildHook('thread-new', { newSession, onSessionCreated });

		await hook.loadHistory();

		expect(onSessionCreated).toHaveBeenCalledOnce();
		expect(onSessionCreated).toHaveBeenCalledWith('thread-new');
	});
});

describe('useAgentChatStream — done executionId', () => {
	it('stamps executionId from done onto minted messages', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'text-start', id: 't1' },
			{ type: 'text-delta', id: 't1', delta: 'Hello' },
			{ type: 'text-end', id: 't1' },
			{ type: 'done', sessionId: 'thread-1', executionId: 'exec-live-1' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('hi');
		await flushPromises();

		const assistant = hook.messages.value.find((m) => m.role === 'assistant');
		expect(assistant?.content).toBe('Hello');
		expect(assistant?.executionId).toBe('exec-live-1');
	});

	it.each(['error', 'stop'] as const)(
		'clears creation intent after admission followed by %s',
		async (outcome) => {
			let closeStream = () => {};
			const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
				makeSseResponse([
					{ type: 'start-step' },
					{ type: 'error', message: 'The turn failed after admission' },
				]),
			);
			if (outcome === 'stop') {
				getChatMessagesMock.mockResolvedValue({
					messages: [],
					openSuspensions: [],
					activeExecutionId: null,
				});
				fetchMock.mockImplementationOnce(async (_input, init) => {
					const stream = makeControllableSseResponse(
						[
							{
								type: 'execution-started',
								executionId: 'execution-1',
								sessionId: 'thread-new',
							},
							{ type: 'start-step' },
						],
						init?.signal ?? null,
					);
					closeStream = () => stream.close([{ type: 'done' }]);
					return stream.response;
				});
				cancelAgentChatExecutionMock.mockImplementation(async () => {
					closeStream();
					return { cancelRequested: true };
				});
			}
			globalThis.fetch = fetchMock as typeof fetch;
			const newSession = ref(true);
			const onSessionCreated = vi.fn(() => {
				newSession.value = false;
			});
			const hook = buildHook('thread-new', {
				newSession,
				onSessionCreated,
			});

			const firstTurn = hook.sendMessage('hi');
			await vi.waitFor(() => expect(onSessionCreated).toHaveBeenCalledOnce());
			if (outcome === 'stop') await hook.stopGenerating();
			await firstTurn;
			if (outcome === 'stop') {
				await vi.waitFor(() => expect(hook.isStreaming.value).toBe(false));
			}
			await hook.sendMessage('try again');
			await flushPromises();

			expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
				message: 'hi',
				sessionId: 'thread-new',
				newSession: true,
			});
			expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
				message: 'try again',
				sessionId: 'thread-new',
			});
			expect(onSessionCreated).toHaveBeenCalledOnce();
			expect(onSessionCreated).toHaveBeenCalledWith('thread-new');
		},
	);

	it.each(['http', 'stream'] as const)(
		'keeps creation intent after a %s failure before admission',
		async (failure) => {
			getChatMessagesMock.mockRejectedValue({ httpStatusCode: 404 });
			const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
				failure === 'http'
					? new Response(JSON.stringify({ message: 'Unavailable' }), { status: 503 })
					: makeSseResponse([{ type: 'error', message: 'Unavailable' }], false),
			);
			globalThis.fetch = fetchMock as typeof fetch;
			const newSession = ref(true);
			const onSessionCreated = vi.fn(() => {
				newSession.value = false;
			});
			const hook = buildHook('thread-new', { newSession, onSessionCreated });

			await hook.loadHistory();
			await hook.sendMessage('hi');
			await flushPromises();
			await hook.sendMessage('try again');
			await flushPromises();

			expect(onSessionCreated).not.toHaveBeenCalled();
			expect(newSession.value).toBe(true);
			expect(fetchMock).toHaveBeenCalledTimes(2);
			for (const [, init] of fetchMock.mock.calls) {
				expect(JSON.parse(String(init?.body))).toMatchObject({
					sessionId: 'thread-new',
					newSession: true,
				});
			}
		},
	);
});

describe('useAgentChatStream — subagent-chunk', () => {
	it('accumulates child text on the parent delegate tool call without minting a bubble', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-delegate',
				toolName: 'delegate_subagent',
				input: { subAgentId: 'inline', taskName: 'research', goal: 'Find it' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-delegate',
				toolName: 'delegate_subagent',
				startTime: 1_000,
			},
			{
				type: 'subagent-chunk',
				parentToolCallId: 'tc-delegate',
				taskPath: '/root/research_0',
				chunk: { type: 'text-delta', id: 't-1', delta: 'Hello ' },
			},
			{
				type: 'subagent-chunk',
				parentToolCallId: 'tc-delegate',
				taskPath: '/root/research_0',
				chunk: { type: 'text-delta', id: 't-1', delta: 'world' },
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('delegate');
		await flushPromises();
		await nextTick();

		const assistants = hook.messages.value.filter((m) => m.role === 'assistant');
		expect(assistants).toHaveLength(1);
		expect(assistants[0].toolCalls?.[0].childProgress?.text).toBe('Hello world');
	});

	it('accumulates child reasoning deltas into one segment by id', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-delegate',
				toolName: 'delegate_subagent',
				input: { subAgentId: 'inline', taskName: 'research', goal: 'Find it' },
			},
			{ type: 'finish-step' },
			{
				type: 'subagent-chunk',
				parentToolCallId: 'tc-delegate',
				taskPath: '/root/research_0',
				chunk: { type: 'reasoning-delta', id: 'r-1', delta: 'Think ' },
			},
			{
				type: 'subagent-chunk',
				parentToolCallId: 'tc-delegate',
				taskPath: '/root/research_0',
				chunk: { type: 'reasoning-delta', id: 'r-1', delta: 'hard' },
			},
			{
				type: 'subagent-chunk',
				parentToolCallId: 'tc-delegate',
				taskPath: '/root/research_0',
				chunk: { type: 'reasoning-end', id: 'r-1' },
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('delegate');
		await flushPromises();
		await nextTick();

		const segments = hook.messages.value[1].toolCalls?.[0].childProgress?.reasoningSegments;
		expect(segments).toHaveLength(1);
		expect(segments?.[0].content).toBe('Think hard');
		expect(segments?.[0].endTime).toBeTypeOf('number');
	});

	it('ignores subagent-chunk events whose parentToolCallId matches nothing', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-other',
				toolName: 'compute',
				input: {},
			},
			{ type: 'finish-step' },
			{
				type: 'subagent-chunk',
				parentToolCallId: 'missing',
				taskPath: '/root/x_0',
				chunk: { type: 'text-delta', id: 't-1', delta: 'orphan' },
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('hi');
		await flushPromises();
		await nextTick();

		expect(hook.messages.value[1].toolCalls?.[0].childProgress).toBeUndefined();
		expect(hook.messages.value).toHaveLength(2);
	});

	it('keeps childProgress after the delegate tool result arrives', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-delegate',
				toolName: 'delegate_subagent',
				input: { subAgentId: 'inline', taskName: 'research', goal: 'Find it' },
			},
			{ type: 'finish-step' },
			{
				type: 'subagent-chunk',
				parentToolCallId: 'tc-delegate',
				taskPath: '/root/research_0',
				chunk: { type: 'text-delta', id: 't-1', delta: 'live' },
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-delegate',
				toolName: 'delegate_subagent',
				output: { status: 'completed', answer: 'done' },
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('delegate');
		await flushPromises();
		await nextTick();

		expect(hook.messages.value[1].toolCalls?.[0].childProgress?.text).toBe('live');
		expect(hook.messages.value[1].toolCalls?.[0].output).toEqual({
			status: 'completed',
			answer: 'done',
		});
	});
});

describe('useAgentChatStream — stuck/desync recovery', () => {
	let originalFetch: typeof fetch;
	let originalLocalStorage: typeof globalThis.localStorage | undefined;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		originalLocalStorage = globalThis.localStorage;
		vi.stubGlobal('localStorage', { getItem: vi.fn(() => '') });
		cancelAgentChatExecutionMock.mockReset();
		cancelAgentChatExecutionMock.mockResolvedValue({ cancelRequested: true });
		cancelAgentChatRunMock.mockReset();
		cancelAgentChatRunMock.mockResolvedValue({ cancelled: true });
		getTestChatMessagesMock.mockReset();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.stubGlobal('localStorage', originalLocalStorage);
		vi.restoreAllMocks();
	});

	it('settles in-flight tool calls to done when done arrives without tool-execution-end (desync)', async () => {
		// tool-execution-start fires, but the terminal tool-execution-end/tool-result
		// events never arrive before `done` — the UI must stop pulsing.
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-stuck',
				toolName: 'create_issue',
				input: { title: 'x' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-stuck',
				toolName: 'create_issue',
				startTime: 1_000,
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('go');
		await flushPromises();
		await nextTick();

		expect(hook.isStreaming.value).toBe(false);
		// Tool would otherwise keep pulsing as `running` — it must settle.
		expect(hook.messages.value[1].toolCalls?.[0].state).toBe('done');
	});

	it('stopGenerating settles stale in-flight tool calls when the stream already ended', async () => {
		// Same desync: stream ended with a tool still `running`, no open suspension.
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{
				type: 'tool-call',
				toolCallId: 'tc-stuck-2',
				toolName: 'create_issue',
				input: { title: 'y' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-stuck-2',
				toolName: 'create_issue',
				startTime: 1_000,
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('go');
		await flushPromises();
		await nextTick();

		// Simulate the desync: force the tool back to `running` after the stream
		// ended (as if its terminal event had been lost).
		hook.messages.value[1].toolCalls![0].state = 'running';
		expect(hook.isStreaming.value).toBe(false);

		await hook.stopGenerating();
		await nextTick();

		expect(hook.messages.value[1].toolCalls?.[0].state).toBe('cancelled');
		// No backend cancel call — there is no runId/suspension to cancel.
		expect(cancelAgentChatRunMock).not.toHaveBeenCalled();
	});
});

describe('useAgentChatStream — transcript push', () => {
	it('loads a signal before output without starting a local stream', async () => {
		const { hook, dispose } = scopedHook('thread-1');
		const backgroundJobSignal = {
			tasks: [{ id: 'job-1', title: 'Research', kind: 'subagent', status: 'completed' }],
		};
		getChatMessagesMock.mockResolvedValue({
			messages: [
				{
					id: 'exec-1:assistant',
					executionId: 'exec-1',
					role: 'assistant',
					content: [],
					executionStatus: 'running',
					backgroundTaskSignal: backgroundJobSignal,
				},
			],
			openSuspensions: [],
		});
		try {
			emitPush(update());
			emitPush(update());
			await flushPromises();
			expect(hook.messages.value).toHaveLength(1);
			expect(hook.messages.value[0]).toMatchObject({ backgroundJobSignal, content: '' });
			expect(hook.isStreaming.value).toBe(false);
			expect(hook.messagingState.value).toBe('idle');
		} finally {
			dispose();
		}
	});

	/** The subscription is eager, so an effect scope is enough — no mount needed. */
	function scopedHook(continueSessionId?: string) {
		const scope = effectScope();
		const hook = scope.run(() => buildHook(continueSessionId))!;
		return { hook, dispose: () => scope.stop() };
	}

	const update = (overrides: Record<string, unknown> = {}) => ({
		type: 'agentExecutionUpdated',
		data: {
			projectId: 'p1',
			agentId: 'a1',
			threadId: 'thread-1',
			executionId: 'exec-1',
			...overrides,
		},
	});

	const emitPush = (event: unknown) => {
		for (const listener of [...pushListeners]) listener(event);
	};

	beforeEach(() => {
		pushListeners.length = 0;
		pushConnectMock.mockClear();
		getTestChatMessagesMock.mockReset();
		getChatMessagesMock.mockReset();
		getTestChatMessagesMock.mockResolvedValue({ messages: [], openSuspensions: [] });
		getChatMessagesMock.mockResolvedValue({ messages: [], openSuspensions: [] });
	});

	function history(content: string): AgentChatMessagesResponse {
		return {
			messages: [{ id: content, role: 'assistant', content: [{ type: 'text', text: content }] }],
			openSuspensions: [],
		};
	}

	it('discards a snapshot when a newer push arrives during its request', async () => {
		const stale = Promise.withResolvers<ReturnType<typeof history>>();
		const fresh = Promise.withResolvers<ReturnType<typeof history>>();
		getChatMessagesMock
			.mockResolvedValueOnce(history('saved'))
			.mockReturnValueOnce(stale.promise)
			.mockReturnValueOnce(fresh.promise);
		const { hook, dispose } = scopedHook('thread-1');
		await hook.loadHistory();
		emitPush(update());
		await flushPromises();
		emitPush(update());
		stale.resolve(history('old reply'));
		await flushPromises();
		expect(hook.messages.value.map((message) => message.content)).toEqual(['saved']);
		expect(getChatMessagesMock).toHaveBeenCalledTimes(3);
		fresh.resolve(history('new reply'));
		await flushPromises();
		expect(hook.messages.value.map((message) => message.content)).toEqual(['new reply']);
		dispose();
	});

	it('discards a snapshot when a complete stream runs during its request', async () => {
		const stale = Promise.withResolvers<ReturnType<typeof history>>();
		const fresh = Promise.withResolvers<ReturnType<typeof history>>();
		getChatMessagesMock
			.mockReturnValueOnce(stale.promise)
			.mockReturnValueOnce(fresh.promise)
			.mockResolvedValue(history('new reply'));
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(
				makeSseResponse([
					{ type: 'text-delta', id: 'reply', delta: 'new reply' },
					{ type: 'done' },
				]),
			);
		const { hook, dispose } = scopedHook('thread-1');
		try {
			emitPush(update());
			await flushPromises();
			await hook.sendMessage('hello');
			await flushPromises();
			stale.resolve(history('old reply'));
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual(['hello', 'new reply']);
			expect(getChatMessagesMock).toHaveBeenCalledTimes(2);
			fresh.resolve(history('new reply'));
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual(['new reply']);
		} finally {
			dispose();
			fetchMock.mockRestore();
		}
	});

	it('discards a snapshot requested during a stream that finishes before the response', async () => {
		const stale = Promise.withResolvers<ReturnType<typeof history>>();
		const fresh = Promise.withResolvers<ReturnType<typeof history>>();
		getChatMessagesMock
			.mockReturnValueOnce(stale.promise)
			.mockReturnValueOnce(fresh.promise)
			.mockResolvedValue(history('new reply'));
		const stream = makeControllableSseResponse(
			[{ type: 'text-delta', id: 'reply', delta: 'new reply' }],
			null,
		);
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(stream.response);
		const { hook, dispose } = scopedHook('thread-1');
		try {
			const sending = hook.sendMessage('hello');
			await flushPromises();
			const loading = hook.loadHistory();
			stream.close([{ type: 'done' }]);
			await sending;
			stale.resolve(history('old reply'));
			await loading;
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual(['hello', 'new reply']);
			expect(getChatMessagesMock).toHaveBeenCalledTimes(2);
			fresh.resolve(history('new reply'));
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual(['new reply']);
		} finally {
			dispose();
			fetchMock.mockRestore();
		}
	});

	it('refreshes after a local stream ends when pushes arrived during the stream', async () => {
		const stream = makeControllableSseResponse(
			[{ type: 'execution-started', executionId: 'exec-live', sessionId: 'thread-1' }],
			null,
		);
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(stream.response);
		const { hook, dispose } = scopedHook('thread-1');
		try {
			const sending = hook.sendMessage('hello');
			await flushPromises();
			emitPush(update());
			await flushPromises();
			expect(getChatMessagesMock).not.toHaveBeenCalled();
			stream.close([{ type: 'done' }]);
			await sending;
			await flushPromises();
			expect(getChatMessagesMock).toHaveBeenCalledTimes(1);
		} finally {
			dispose();
			fetchMock.mockRestore();
		}
	});

	it('refreshes on reconnect and tab visibility without a recurring timer', async () => {
		vi.useFakeTimers();
		connectionState.isConnected = false;
		const { dispose } = scopedHook('thread-1');
		try {
			connectionState.isConnected = true;
			await flushPromises();
			expect(getChatMessagesMock).toHaveBeenCalledTimes(1);
			const visibility = vi.spyOn(document, 'visibilityState', 'get');
			visibility.mockReturnValue('hidden');
			document.dispatchEvent(new Event('visibilitychange'));
			await nextTick();
			visibility.mockReturnValue('visible');
			document.dispatchEvent(new Event('visibilitychange'));
			await flushPromises();
			expect(getChatMessagesMock).toHaveBeenCalledTimes(2);
			await vi.advanceTimersByTimeAsync(60_000);
			expect(getChatMessagesMock).toHaveBeenCalledTimes(2);
			visibility.mockRestore();
		} finally {
			dispose();
			vi.useRealTimers();
		}
	});

	it('keeps the last state through bounded retries and recovers on the next push', async () => {
		vi.useFakeTimers();
		getChatMessagesMock
			.mockResolvedValueOnce(history('saved'))
			.mockRejectedValue(new Error('offline'));
		const { hook, dispose } = scopedHook('thread-1');
		try {
			await hook.loadHistory();
			hook.refresh();
			await flushPromises();
			await vi.advanceTimersByTimeAsync(60_000);
			expect(getChatMessagesMock).toHaveBeenCalledTimes(4);
			expect(hook.messages.value.map((message) => message.content)).toEqual(['saved']);
			getChatMessagesMock.mockResolvedValue(history('current'));
			emitPush(update());
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual(['current']);
		} finally {
			dispose();
			vi.useRealTimers();
		}
	});

	it('keeps initial loading active until the pending queue has loaded', async () => {
		const queue = Promise.withResolvers<{ items: [] }>();
		getAgentChatQueueMock.mockReturnValueOnce(queue.promise);
		getChatMessagesMock.mockResolvedValueOnce({
			...history('running'),
			activeExecutionId: 'exec-1',
		});
		const { hook, dispose } = scopedHook('thread-1');
		try {
			const loading = hook.loadHistory();
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual(['running']);
			expect(hook.isLoadingHistory.value).toBe(true);
			expect(await hook.sendMessage('too soon')).toBe('busy');
			queue.resolve({ items: [] });
			await loading;
			expect(hook.isLoadingHistory.value).toBe(false);
			expect(hook.isStreaming.value).toBe(true);
		} finally {
			queue.resolve({ items: [] });
			dispose();
		}
	});

	it('blocks submission during initial load and discards its stale snapshot', async () => {
		const stale = Promise.withResolvers<ReturnType<typeof history>>();
		getChatMessagesMock.mockReturnValueOnce(stale.promise).mockResolvedValue(history('current'));
		const scope = effectScope();
		const threadId = ref('thread-1');
		const hook = scope.run(() =>
			useAgentChatStream({ projectId: ref('p1'), agentId: ref('a1'), continueSessionId: threadId }),
		)!;
		const loading = hook.loadHistory();
		expect(hook.isLoadingHistory.value).toBe(true);
		expect(hook.isStreaming.value).toBe(true);
		expect(await hook.sendMessage('too soon')).toBe('busy');
		threadId.value = 'thread-2';
		await flushPromises();
		stale.resolve(history('old session'));
		await loading;
		expect(hook.isLoadingHistory.value).toBe(false);
		expect(hook.messages.value.map((message) => message.content)).toEqual(['current']);
		scope.stop();
	});

	// The turn was recorded server-side with no stream attached — re-reading the
	// transcript is the only way the answer reaches the open chat.
	it('re-reads the transcript when this agent’s thread is updated', async () => {
		const { dispose } = scopedHook();

		emitPush(update());
		await flushPromises();

		expect(getTestChatMessagesMock).toHaveBeenCalledTimes(1);
		dispose();
	});

	it.each([
		['another agent', { agentId: 'other-agent' }],
		['another project', { projectId: 'other-project' }],
	])('ignores an update for %s', async (_label, overrides) => {
		const { dispose } = scopedHook();

		emitPush(update(overrides));
		await flushPromises();

		expect(getTestChatMessagesMock).not.toHaveBeenCalled();
		dispose();
	});

	it('ignores unrelated push messages', async () => {
		const { dispose } = scopedHook();

		emitPush({ type: 'executionFinished', data: { projectId: 'p1', agentId: 'a1' } });
		await flushPromises();

		expect(getTestChatMessagesMock).not.toHaveBeenCalled();
		dispose();
	});

	// A continued session shows one thread, so an update to a sibling is not it.
	it('ignores an update for a different thread of a continued session', async () => {
		const { dispose } = scopedHook('thread-1');
		getChatMessagesMock.mockClear();

		emitPush(update({ threadId: 'thread-2' }));
		await flushPromises();

		expect(getChatMessagesMock).not.toHaveBeenCalled();

		emitPush(update({ threadId: 'thread-1' }));
		await flushPromises();

		expect(getChatMessagesMock).toHaveBeenCalledTimes(1);
		dispose();
	});

	// Updates are broadcast per record and again on finalize, for every surface of
	// the agent, so bursts are the norm rather than the exception.
	it('coalesces a burst of updates into one trailing refetch', async () => {
		const { dispose } = scopedHook();

		emitPush(update());
		emitPush(update());
		emitPush(update());
		await flushPromises();

		expect(getTestChatMessagesMock).toHaveBeenCalledTimes(2);
		dispose();
	});

	// The send may start while the refetch is in flight, so the guard has to hold
	// after the fetch too — otherwise stale history overwrites the live transcript.

	it('drops a background refetch that lands after a send has started', async () => {
		const { hook, dispose } = scopedHook();
		const stale = Promise.withResolvers<AgentChatMessagesResponse>();
		getTestChatMessagesMock.mockReturnValueOnce(stale.promise);
		emitPush(update());
		await flushPromises();
		const stream = makeControllableSseResponse(
			[{ type: 'execution-started', executionId: 'exec-live', sessionId: 'thread-1' }],
			null,
		);
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(stream.response);
		const sending = hook.sendMessage('live');
		await flushPromises();
		try {
			stale.resolve(history('stale'));
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual(['live']);
		} finally {
			stream.close([{ type: 'done' }]);
			await sending;
			dispose();
			fetchMock.mockRestore();
		}
	});

	it('drops queued refreshes when the chat closes', async () => {
		const { dispose } = scopedHook('thread-1');
		emitPush(update());
		dispose();
		await flushPromises();
		expect(getChatMessagesMock).not.toHaveBeenCalled();
	});

	it('drops an in-flight response and its queued refresh when the chat closes', async () => {
		const stale = Promise.withResolvers<ReturnType<typeof history>>();
		getChatMessagesMock.mockResolvedValueOnce(history('saved')).mockReturnValueOnce(stale.promise);
		const { hook, dispose } = scopedHook('thread-1');
		await hook.loadHistory();
		emitPush(update());
		await flushPromises();
		hook.refresh();
		dispose();
		stale.resolve(history('late reply'));
		await flushPromises();
		expect(hook.messages.value.map((message) => message.content)).toEqual(['saved']);
		expect(getChatMessagesMock).toHaveBeenCalledTimes(2);
	});

	it('stops listening once the chat is torn down', () => {
		const { dispose } = scopedHook();
		expect(pushListeners).toHaveLength(2);

		dispose();

		expect(pushListeners).toHaveLength(0);
	});
});

describe('useAgentChatStream — execution recovery', () => {
	const started: AgentSseEvent = {
		type: 'execution-started',
		executionId: 'exec-1',
		sessionId: 'thread-1',
	};
	const push = () => {
		for (const listener of [...pushListeners])
			listener({
				type: 'agentExecutionUpdated',
				data: { projectId: 'p1', agentId: 'a1', threadId: 'thread-1', executionId: 'exec-1' },
			});
	};
	const running: AgentChatMessagesResponse = {
		messages: [],
		openSuspensions: [],
		activeExecutionId: 'exec-1',
	};

	beforeEach(() => {
		pushListeners.length = 0;
		connectionState.isConnected = false;
		getChatMessagesMock.mockReset().mockResolvedValue(running);
		getTestChatMessagesMock.mockReset().mockResolvedValue(running);
		cancelAgentChatExecutionMock.mockReset().mockResolvedValue({ cancelRequested: true });
		vi.stubGlobal('fetch', vi.fn());
		vi.stubGlobal('localStorage', { getItem: vi.fn(() => '') });
	});
	afterEach(() => vi.unstubAllGlobals());

	it('recovers before the first token and replaces child snapshots without duplication', async () => {
		const hook = buildHook('thread-1');
		await hook.loadHistory();
		expect(hook.isStreaming.value).toBe(true);
		expect(hook.messages.value).toEqual([]);
		const snapshot: AgentChatMessagesResponse = {
			...running,
			messages: [
				{
					id: 'exec-1:assistant',
					executionId: 'exec-1',
					executionStatus: 'running',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolName: 'delegate_subagent',
							toolCallId: 'child-1',
							input: {},
							childTrace: {
								text: 'partial child answer',
								reasoningSegments: [],
								steps: [{ toolCallId: 'step-1', toolName: 'lookup', running: true }],
							},
						},
					],
				},
			],
		};
		getChatMessagesMock.mockResolvedValue(snapshot);
		push();
		await flushPromises();
		push();
		await flushPromises();
		expect(hook.messages.value).toHaveLength(1);
		expect(hook.messages.value[0].toolCalls?.[0]).toMatchObject({
			state: 'running',
			childProgress: { text: 'partial child answer', steps: [{ running: true }] },
		});
		getChatMessagesMock.mockRejectedValue(new Error('unavailable'));
		push();
		await flushPromises();
		expect(hook.activeExecutionId.value).toBe('exec-1');
		expect(hook.messages.value[0].toolCalls?.[0].state).toBe('running');
		expect(fetch).not.toHaveBeenCalled();
	});

	it.each(['success', 'error', 'cancelled', 'interrupted'] as const)(
		'reconciles a recorded %s in both owner tabs',
		async (status) => {
			const first = buildHook('thread-1');
			const second = buildHook('thread-1');
			await Promise.all([first.loadHistory(), second.loadHistory()]);
			await second.stopGenerating();
			await second.stopGenerating();
			expect(cancelAgentChatExecutionMock).toHaveBeenCalledExactlyOnceWith(
				{ baseUrl: 'http://localhost:5678' },
				'p1',
				'a1',
				'thread-1',
				'exec-1',
			);
			expect(second.isCancelling.value).toBe(true);
			expect(first.isStreaming.value).toBe(true);
			getChatMessagesMock.mockResolvedValue({
				activeExecutionId: null,
				openSuspensions: [],
				messages: [
					{
						id: 'exec-1:assistant',
						executionId: 'exec-1',
						executionStatus: status,
						role: 'assistant',
						content: [{ type: 'text', text: 'retained answer' }],
					},
				],
			});
			push();
			await flushPromises();
			for (const hook of [first, second]) {
				expect(hook.isStreaming.value).toBe(false);
				expect(hook.isCancelling.value).toBe(false);
				expect(hook.messages.value.map((message) => message.content)).toEqual(['retained answer']);
			}
			expect(fetch).not.toHaveBeenCalled();
		},
	);

	it.each([
		{
			toolName: 'calculator',
			cardName: APPROVAL_TOOL_NAME,
			input: {},
			suspendPayload: { type: 'approval', toolName: 'calculator', args: {} },
			resumeData: { approved: true },
		},
		{
			toolName: N8N_CHAT_ACTION_TOOL_NAME,
			cardName: N8N_CHAT_ACTION_TOOL_NAME,
			input: {
				action: 'respond',
				input: {
					message: { card: { components: [{ type: 'button', label: 'Yes', value: 'yes' }] } },
				},
			},
			suspendPayload: undefined,
			resumeData: { type: 'button', value: 'yes' },
		},
		{
			toolName: 'approval_workflow',
			cardName: WAIT_TOOL_NAME,
			input: {},
			suspendPayload: {
				type: 'workflow_wait',
				title: 'Waiting',
				components: [{ type: 'button', label: 'Check', value: 'continue' }],
			},
			resumeData: { type: 'button', value: 'continue' },
		},
	])(
		'keeps a repeated $cardName suspension usable after recovery',
		async ({ toolName, cardName, input, suspendPayload, resumeData }) => {
			const hook = buildHook('thread-1');
			await hook.loadHistory();
			getChatMessagesMock.mockResolvedValue({
				activeExecutionId: null,
				messages: [
					{
						id: 'exec-1:assistant',
						role: 'assistant',
						executionStatus: 'success',
						content: [{ type: 'tool-call', toolCallId: 'tc-1', toolName, input, suspendPayload }],
					},
				],
				openSuspensions: [{ toolCallId: 'tc-1', runId: 'run-1', suspendPayload }],
			} satisfies AgentChatMessagesResponse);
			push();
			await flushPromises();
			for (const executionId of ['exec-2', 'exec-3']) {
				expect(hook.isStreaming.value).toBe(false);
				expect(hook.messages.value[0].interactive).toMatchObject({
					toolName: cardName,
					runId: 'run-1',
					toolCallId: 'tc-1',
				});
				expect(hook.messages.value[0].interactive?.resolvedAt).toBeUndefined();
				vi.mocked(fetch).mockResolvedValueOnce(
					makeInterruptedSseResponse([
						{ type: 'execution-started', executionId, sessionId: 'thread-1' },
					]),
				);
				await hook.resume({ runId: 'run-1', toolCallId: 'tc-1', resumeData });
				await flushPromises();
				expect(hook.messages.value).toHaveLength(1);
				expect(hook.messages.value[0].status).toBe('awaitingUser');
			}
			expect(fetch).toHaveBeenCalledTimes(2);
		},
	);

	it('keeps early Stop until a resume is accepted', async () => {
		const response = Promise.withResolvers<Response>();
		let signal: AbortSignal | null = null;
		vi.mocked(fetch).mockImplementation(async (_url, init) => {
			signal = init?.signal ?? null;
			return await response.promise;
		});
		const hook = buildHook('thread-1');
		const request = hook.resume({
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: { approved: true },
		});
		await hook.stopGenerating();
		expect(hook.isCancelling.value).toBe(true);
		expect(cancelAgentChatExecutionMock).not.toHaveBeenCalled();
		const stream = makeControllableSseResponse([started], signal);
		response.resolve(stream.response);
		await flushPromises();
		expect(cancelAgentChatExecutionMock).toHaveBeenCalledExactlyOnceWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
			'thread-1',
			'exec-1',
		);
		expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(false);
		getChatMessagesMock.mockResolvedValue({
			messages: [],
			openSuspensions: [],
			activeExecutionId: null,
		});
		stream.close([{ type: 'done', executionId: 'exec-1' }]);
		await request;
		await flushPromises();
		expect(hook.isCancelling.value).toBe(false);
		expect(hook.isStreaming.value).toBe(false);
		expect(fetch).toHaveBeenCalledOnce();
	});

	it('recovers when Stop waits too long for acceptance', async () => {
		vi.useFakeTimers();
		try {
			getChatMessagesMock.mockResolvedValue({
				messages: [],
				openSuspensions: [],
				activeExecutionId: null,
			});
			vi.mocked(fetch).mockImplementation(
				async (_url, init) =>
					await new Promise<Response>((_resolve, reject) => {
						init?.signal?.addEventListener(
							'abort',
							() => reject(new DOMException('Aborted', 'AbortError')),
							{ once: true },
						);
					}),
			);
			const hook = buildHook('thread-1');
			const request = hook.resume({
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { approved: true },
			});
			await flushPromises();

			await hook.stopGenerating();
			await vi.advanceTimersByTimeAsync(30_000);
			await request;
			await flushPromises();

			expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
			expect(getChatMessagesMock).toHaveBeenCalled();
			expect(hook.isCancelling.value).toBe(false);
			expect(hook.isStreaming.value).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it.each(['start', 'resume'] as const)(
		'follows snapshots after %s disconnects and never resubmits',
		async (operation) => {
			vi.mocked(fetch).mockResolvedValue(
				makeInterruptedSseResponse([
					started,
					{ type: 'text-delta', id: 'live-only-id', delta: 'partial' },
				]),
			);
			const hook = buildHook('thread-1');
			getChatMessagesMock.mockResolvedValue({
				...running,
				messages: [
					{
						id: 'exec-1:assistant',
						executionId: 'exec-1',
						executionStatus: 'running',
						role: 'assistant',
						content: [{ type: 'text', text: 'authoritative snapshot' }],
					},
				],
			});
			if (operation === 'start') await hook.sendMessage('hello');
			else
				await hook.resume({ runId: 'run-1', toolCallId: 'tc-1', resumeData: { approved: true } });
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual([
				'authoritative snapshot',
			]);
			expect(hook.isStreaming.value).toBe(true);
			connectionState.isConnected = true;
			await flushPromises();
			expect(fetch).toHaveBeenCalledOnce();
		},
	);

	it('detaches the old reader on reload and leaves Stop to an explicit request', async () => {
		let signal: AbortSignal | null = null;
		vi.mocked(fetch).mockImplementation(async (_url, init) => {
			signal = init?.signal ?? null;
			return makeAbortableSseResponse([started], signal);
		});
		const old = buildHook('thread-1');
		const sending = old.sendMessage('hello');
		await flushPromises();
		old.detachStream();
		await sending;
		const reloaded = buildHook('thread-1');
		await reloaded.loadHistory();
		expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
		expect(reloaded.activeExecutionId.value).toBe('exec-1');
		expect(cancelAgentChatExecutionMock).not.toHaveBeenCalled();
		expect(fetch).toHaveBeenCalledOnce();
	});

	it.each(['start', 'steer'])(
		'does not accept or repeat a %s rejected as busy',
		async (operation) => {
			vi.mocked(fetch).mockResolvedValue(
				makeSseResponse([
					{
						type: 'error',
						errorCode: 'turn_already_running',
						message: 'A turn is already running.',
					},
				]),
			);
			const accepted = vi.fn();
			const hook = buildHook('thread-1');
			hook.messages.value = [
				{
					id: 'question',
					role: 'assistant',
					content: '',
					status: 'awaitingUser',
					interactive: {
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'tc-1',
						runId: 'run-1',
						input: { card: { components: [{ type: 'button', label: 'Yes', value: 'yes' }] } },
					},
				},
			];
			const outcome =
				operation === 'start'
					? await hook.sendMessage('keep my draft', undefined, accepted)
					: await hook.cancelAndSteer('keep my draft', accepted);
			expect(outcome).toBe('busy');
			await flushPromises();
			expect(accepted).not.toHaveBeenCalled();
			expect(hook.messages.value).toEqual([]);
			expect(hook.activeExecutionId.value).toBe('exec-1');
			expect(fetch).toHaveBeenCalledOnce();
		},
	);
});

describe('useAgentChatStream — queued submissions', () => {
	beforeEach(() => {
		pushListeners.length = 0;
		connectionState.isConnected = false;
		getChatMessagesMock.mockResolvedValue({
			messages: [],
			openSuspensions: [],
			activeExecutionId: null,
		});
		cancelAgentChatExecutionMock.mockReset().mockResolvedValue({ cancelRequested: true });
		vi.stubGlobal('localStorage', { getItem: vi.fn(() => '') });
	});
	afterEach(() => vi.unstubAllGlobals());

	it('keeps an accepted steer reserved when the queue refresh fails', async () => {
		getChatMessagesMock.mockResolvedValue({
			messages: [],
			openSuspensions: [],
			activeExecutionId: 'A',
		});
		getAgentChatQueueMock.mockResolvedValue({
			items: [
				{ id: '3', message: 'C', createdAt: new Date().toISOString(), steeringExecutionId: null },
			],
			steerableExecutionId: 'A',
		});
		const hook = buildHook('thread-1');
		await hook.loadHistory();
		getAgentChatQueueMock.mockRejectedValueOnce(new Error('Queue refresh failed'));

		await hook.steerQueuedMessage('3');

		expect(steerAgentQueuedMessageMock).toHaveBeenCalledOnce();
		expect(hook.steeringQueueIds.value.has('3')).toBe(false);
		expect(hook.queuedMessages.value[0]).toMatchObject({ id: '3', steeringExecutionId: 'A' });
		expect(hook.messages.value).toEqual([]);

		const history = Promise.withResolvers<AgentChatMessagesResponse>();
		getChatMessagesMock.mockReturnValueOnce(history.promise);
		getAgentChatQueueMock.mockResolvedValue({
			items: [
				{ id: '3', message: 'C', createdAt: new Date().toISOString(), steeringExecutionId: null },
			],
			steerableExecutionId: 'B',
		});
		for (const listener of [...pushListeners])
			listener({
				type: 'agentExecutionUpdated',
				data: { projectId: 'p1', agentId: 'a1', threadId: 'thread-1', executionId: 'A' },
			});
		await flushPromises();
		expect(hook.activeExecutionId.value).toBe('A');
		expect(hook.canSteer.value).toBe(false);
		expect(hook.messages.value).toEqual([]);

		history.resolve({
			messages: [
				{
					id: 'a-finished',
					executionId: 'A',
					executionStatus: 'success',
					role: 'assistant',
					content: [{ type: 'text', text: 'A finished' }],
				},
			],
			openSuspensions: [],
			activeExecutionId: 'B',
		});
		await flushPromises();
		expect(hook.queuedMessages.value).toEqual([
			expect.objectContaining({ id: '3', message: 'C', steeringExecutionId: null }),
		]);
		expect(hook.messages.value.map(({ content }) => content)).toEqual(['A finished']);
		expect(hook.activeExecutionId.value).toBe('B');
		expect(hook.canSteer.value).toBe(true);
	});

	it.each([false, true])(
		'adds a consumed message inside A without changing ownership (late acceptance: %s)',
		async (lateAcceptance) => {
			const pending = [
				{ id: '2', message: 'B', createdAt: new Date().toISOString(), steeringExecutionId: null },
				{ id: '3', message: 'C', createdAt: new Date().toISOString(), steeringExecutionId: null },
			];
			const streams: Array<ReturnType<typeof makeControllableSseResponse>> = [];
			const signals: Array<AbortSignal | null> = [];
			vi.stubGlobal(
				'fetch',
				vi.fn(async (_url, init: RequestInit) => {
					const id = String(streams.length + 1);
					const events: AgentSseEvent[] = [];
					if (id !== '3' || !lateAcceptance)
						events.push({ type: 'message-queued', queueId: id, sessionId: 'thread-1' });
					if (id === '1')
						events.push({ type: 'execution-started', executionId: 'A', sessionId: 'thread-1' });
					const stream = makeControllableSseResponse(events, null);
					streams.push(stream);
					signals.push(init.signal ?? null);
					return stream.response;
				}),
			);
			const hook = buildHook('thread-1');
			// The card is stale after a remote resume and has not refreshed in this tab.
			hook.messages.value = [
				{
					id: 'old-question',
					role: 'assistant',
					content: 'Old question',
					status: 'awaitingUser',
					interactive: {
						toolName: N8N_CHAT_ACTION_TOOL_NAME,
						toolCallId: 'old-tool-call',
						runId: 'old-run',
						input: { card: { components: [{ type: 'button', label: 'Yes', value: 'yes' }] } },
					},
				},
			];
			await hook.sendMessage('A');
			getAgentChatQueueMock.mockResolvedValue({ items: pending, steerableExecutionId: 'A' });
			await hook.sendMessage('B');
			const submitted = hook.sendMessage('C');
			await flushPromises();
			expect(hook.canSteer.value).toBe(true);
			steerAgentQueuedMessageMock.mockImplementationOnce(async () => {
				getAgentChatQueueMock.mockResolvedValue({
					items: [pending[0], { ...pending[1], steeringExecutionId: 'A' }],
					steerableExecutionId: 'A',
				});
			});
			await hook.steerQueuedMessage('3');
			expect(steerAgentQueuedMessageMock).toHaveBeenCalledWith(
				expect.anything(),
				'p1',
				'a1',
				'thread-1',
				'3',
				{ executionId: 'A' },
			);
			expect(hook.queuedMessages.value[1].steeringExecutionId).toBe('A');
			expect(hook.messages.value.map(({ content }) => content)).toEqual(['Old question', 'A']);
			const steered: AgentSseEvent = {
				type: 'message-steered',
				queueId: '3',
				executionId: 'A',
				message: {
					id: 'stable-c',
					role: 'user',
					content: [{ type: 'text', text: 'C' }],
					executionId: 'A',
				},
			};
			getAgentChatQueueMock.mockResolvedValue({ items: [pending[0]], steerableExecutionId: 'A' });
			streams[0].emit([
				{ type: 'text-delta', id: 'before', delta: 'before' },
				steered,
				{ type: 'text-delta', id: 'after', delta: 'after' },
				steered,
				{ type: 'text-delta', id: 'after', delta: ' again' },
			]);
			await flushPromises();
			if (lateAcceptance)
				streams[2].emit([{ type: 'message-queued', queueId: '3', sessionId: 'thread-1' }]);
			await submitted;
			await flushPromises();
			streams[2].close([{ type: 'done', executionId: 'A' }]);
			expect(hook.messages.value.map(({ content }) => content)).toEqual([
				'Old question',
				'A',
				'before',
				'C',
				'after again',
			]);
			expect(hook.messages.value[3].id).toBe('stable-c');
			expect(hook.queuedMessages.value.map(({ id }) => id)).toEqual(['2']);
			expect(signals[2]?.aborted).toBe(true);
			expect(signals[0]?.aborted).toBe(false);
			expect(hook.activeExecutionId.value).toBe('A');
			await hook.stopGenerating();
			expect(cancelAgentChatExecutionMock.mock.calls.at(-1)?.[4]).toBe('A');
			streams[0].close();
			streams[1].close();
		},
	);

	it('restores consumed input and reserved rows from the server without submitting them again', async () => {
		getChatMessagesMock.mockResolvedValue({
			messages: [
				{ id: 'a', role: 'user', executionId: 'A', content: [{ type: 'text', text: 'A' }] },
				{
					id: 'a-before',
					role: 'assistant',
					executionId: 'A',
					content: [{ type: 'text', text: 'before' }],
				},
				{ id: 'stable-c', role: 'user', executionId: 'A', content: [{ type: 'text', text: 'C' }] },
			],
			openSuspensions: [],
			activeExecutionId: 'A',
		});
		getAgentChatQueueMock.mockResolvedValue({
			items: [
				{ id: '4', message: 'D', createdAt: new Date().toISOString(), steeringExecutionId: 'A' },
			],
			steerableExecutionId: 'A',
		});
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		const hook = buildHook('thread-1');
		await hook.loadHistory();
		expect(hook.messages.value.map(({ content }) => content)).toEqual(['A', 'before', 'C']);
		expect(hook.queuedMessages.value[0]).toMatchObject({ id: '4', steeringExecutionId: 'A' });
		expect(hook.activeExecutionId.value).toBe('A');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('keeps B and C out of the conversation, stops only A, and removes pending C', async () => {
		const pending = [
			{ id: '2', message: 'B', createdAt: new Date().toISOString() },
			{ id: '3', message: 'C', createdAt: new Date().toISOString() },
		];
		const streams: Array<ReturnType<typeof makeControllableSseResponse>> = [];
		const signals: Array<AbortSignal | null> = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url, init: RequestInit) => {
				const id = String(streams.length + 1);
				const events: AgentSseEvent[] = [
					{ type: 'message-queued', queueId: id, sessionId: 'thread-1' },
				];
				if (id === '1')
					events.push({ type: 'execution-started', executionId: 'A', sessionId: 'thread-1' });
				const stream = makeControllableSseResponse(events, init.signal ?? null);
				streams.push(stream);
				signals.push(init.signal ?? null);
				return stream.response;
			}),
		);
		const hook = buildHook('thread-1');
		await hook.sendMessage('A');
		getAgentChatQueueMock.mockResolvedValue({ items: pending });
		await hook.sendMessage('B');
		await hook.sendMessage('C');
		await flushPromises();
		expect(hook.queuedMessages.value.map(({ message }) => message)).toEqual(['B', 'C']);
		expect(hook.messages.value.map(({ content }) => content)).toEqual(['A']);
		expect(hook.isSubmitting.value).toBe(false);

		const stopped = Promise.withResolvers<{ cancelRequested: boolean }>();
		cancelAgentChatExecutionMock.mockReturnValueOnce(stopped.promise);
		const stop = hook.stopGenerating();
		getAgentChatQueueMock.mockResolvedValue({ items: [pending[1]] });
		streams[1].emit([{ type: 'execution-started', executionId: 'B', sessionId: 'thread-1' }]);
		await flushPromises();
		streams[0].close([{ type: 'done', executionId: 'A' }]);
		stopped.resolve({ cancelRequested: true });
		await stop;
		await flushPromises();
		expect(hook.activeExecutionId.value).toBe('B');
		expect(hook.isStreaming.value).toBe(true);
		expect(hook.messages.value.map(({ content }) => content)).toEqual(['A', 'B']);
		expect(hook.queuedMessages.value.map(({ message }) => message)).toEqual(['C']);
		expect(cancelAgentChatExecutionMock.mock.calls.map((args) => args[4])).toEqual(['A']);

		getAgentChatQueueMock.mockResolvedValue({ items: [] });
		await hook.removeQueuedMessage('3');
		await flushPromises();
		expect(hook.queuedMessages.value).toEqual([]);
		expect(signals[2]?.aborted).toBe(true);
		expect(signals[1]?.aborted).toBe(false);
		expect(hook.activeExecutionId.value).toBe('B');
		streams[1].close([{ type: 'done', executionId: 'B' }]);
	});

	it.each([false, true])(
		'ignores an older start after B starts (B settled: %s)',
		async (settled) => {
			const streams: Array<ReturnType<typeof makeControllableSseResponse>> = [];
			const signals: Array<AbortSignal | null> = [];
			vi.stubGlobal(
				'fetch',
				vi.fn(async (_url, init: RequestInit) => {
					const id = String(streams.length + 1);
					// Deliver A's buffered events even after the request is detached.
					const stream = makeControllableSseResponse(
						[{ type: 'message-queued', queueId: id, sessionId: 'thread-1' }],
						id === '1' ? null : (init.signal ?? null),
					);
					streams.push(stream);
					signals.push(init.signal ?? null);
					return stream.response;
				}),
			);
			const hook = buildHook('thread-1');
			await hook.sendMessage('A');
			await hook.sendMessage('B');
			streams[1].emit([{ type: 'execution-started', executionId: 'B', sessionId: 'thread-1' }]);
			await flushPromises();
			if (settled) {
				streams[1].close([{ type: 'done', executionId: 'B' }]);
				await flushPromises();
			}
			streams[0].close([{ type: 'execution-started', executionId: 'A', sessionId: 'thread-1' }]);
			await flushPromises();
			expect(signals[0]?.aborted).toBe(true);
			expect(hook.activeExecutionId.value).toBe(settled ? null : 'B');
			if (!settled) {
				streams[1].emit([{ type: 'text-delta', id: 'b-text', delta: 'B output' }]);
				await flushPromises();
				expect(hook.messages.value.map(({ content }) => content)).toEqual(['B', 'B output']);
				await hook.stopGenerating();
				expect(cancelAgentChatExecutionMock.mock.lastCall?.[4]).toBe('B');
			}
			hook.detachStream();
		},
	);

	it('handles start before acceptance and preserves the original stream after a removal conflict', async () => {
		let stream: ReturnType<typeof makeControllableSseResponse>;
		const signals: Array<AbortSignal | null> = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url, init: RequestInit) => {
				signals.push(init.signal ?? null);
				stream = makeControllableSseResponse(
					[
						{ type: 'execution-started', executionId: 'A', sessionId: 'thread-1' },
						{ type: 'message-queued', queueId: '1', sessionId: 'thread-1' },
					],
					init.signal ?? null,
				);
				return stream.response;
			}),
		);
		const accepted = vi.fn();
		const hook = buildHook('thread-1');
		await hook.sendMessage('A', undefined, accepted);
		await flushPromises();
		expect(accepted).toHaveBeenCalledOnce();
		expect(hook.queuedMessages.value).toEqual([]);
		expect(hook.messages.value.filter(({ role }) => role === 'user')).toHaveLength(1);
		removeAgentQueuedMessageMock.mockRejectedValueOnce({ httpStatusCode: 409 });
		await hook.removeQueuedMessage('1');
		expect(signals[0]?.aborted).toBe(false);
		expect(hook.activeExecutionId.value).toBe('A');
		expect(cancelAgentChatExecutionMock).not.toHaveBeenCalled();
		hook.detachStream();
	});

	it('bounds waiting connections and keeps approval and history recovery available', async () => {
		const queued = { id: '2', message: 'Later', createdAt: new Date().toISOString() };
		const signals: Array<AbortSignal | null> = [];
		getAgentChatQueueMock.mockResolvedValue({ items: [queued] });
		const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
			if (url.endsWith('/resume'))
				return makeSseResponse([
					{ type: 'execution-started', executionId: 'resumed', sessionId: 'thread-1' },
					{ type: 'done', executionId: 'resumed' },
				]);
			signals.push(init.signal ?? null);
			return makeAbortableSseResponse(
				[{ type: 'message-queued', queueId: String(signals.length), sessionId: 'thread-1' }],
				init.signal ?? null,
			);
		});
		vi.stubGlobal('fetch', fetchMock);
		const hook = buildHook('thread-1');
		for (let i = 0; i < 8; i++) {
			const accepted = vi.fn();
			await hook.sendMessage('Later', undefined, accepted);
			await flushPromises();
			expect(accepted).toHaveBeenCalledOnce();
			expect(signals.filter((signal) => !signal?.aborted).length).toBeLessThanOrEqual(2);
		}
		expect(hook.isStreaming.value).toBe(false);
		getChatMessagesMock.mockResolvedValue({
			messages: [
				{
					id: 'prior',
					role: 'assistant',
					content: [{ type: 'text', text: 'Waiting for approval' }],
				},
			],
			openSuspensions: [],
			activeExecutionId: null,
		});
		hook.refresh();
		await flushPromises();
		expect(hook.messages.value.map(({ content }) => content)).toEqual(['Waiting for approval']);
		expect(
			await hook.resume({ runId: 'approval', toolCallId: 'tc-1', resumeData: { approved: true } }),
		).toBe('sent');
		expect(fetchMock.mock.lastCall?.[0]).toMatch(/\/resume$/);
		expect(fetchMock.mock.calls[0][1].signal?.aborted).toBe(false);
		expect(hook.queuedMessages.value).toEqual([queued]);
		hook.detachStream();
	});

	it.each(['http', 'sse', 'disconnect', 'misconfigured'])(
		'keeps the draft unaccepted after an intake %s failure',
		async (failure) => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => {
					if (failure === 'http') return new Response(null, { status: 503 });
					if (failure === 'disconnect') throw new Error('Disconnected');
					if (failure === 'misconfigured')
						return makeSseResponse(
							[
								{
									type: 'error',
									message: 'Missing model',
									errorCode: 'agent_misconfigured',
									missing: ['model'],
								},
							],
							false,
						);
					return makeSseResponse([{ type: 'error', message: 'Cannot accept message' }], false);
				}),
			);
			const accepted = vi.fn();
			const hook = buildHook('thread-1');
			await hook.sendMessage('Keep this draft', undefined, accepted);
			await flushPromises();
			expect(accepted).not.toHaveBeenCalled();
			expect(hook.isSubmitting.value).toBe(false);
			if (failure === 'misconfigured')
				expect(hook.fatalError.value).toEqual({ message: 'Missing model', missing: ['model'] });
			expect(hook.messages.value).toEqual([]);
			expect(hook.queuedMessages.value).toEqual([]);
		},
	);

	it('shows the accepted edit on start even when the waiting stream and queue snapshot have old text', async () => {
		const item = { id: '1', message: 'original', createdAt: new Date().toISOString() };
		getAgentChatQueueMock.mockResolvedValue({ items: [item] });
		updateAgentQueuedMessageMock.mockResolvedValueOnce(undefined);
		let stream: ReturnType<typeof makeControllableSseResponse>;
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url, init: RequestInit) => {
				stream = makeControllableSseResponse(
					[{ type: 'message-queued', queueId: '1', sessionId: 'thread-1' }],
					init.signal ?? null,
				);
				return stream.response;
			}),
		);
		const hook = buildHook('thread-1');
		await hook.sendMessage('original');
		expect(await hook.updateQueuedMessage('1', 'edited')).toBe('updated');
		expect(updateAgentQueuedMessageMock).toHaveBeenLastCalledWith(
			expect.anything(),
			'p1',
			'a1',
			'thread-1',
			'1',
			{ message: 'edited' },
		);
		stream!.emit([
			{
				type: 'execution-started',
				executionId: 'A',
				sessionId: 'thread-1',
				message: 'edited in another tab',
			},
		]);
		await flushPromises();
		expect(hook.messages.value.map(({ content }) => content)).toEqual(['edited in another tab']);
		hook.detachStream();
	});

	it.each([404, 409, 500])(
		'reports edit failure %i without replacing the queued input',
		async (status) => {
			const item = { id: '1', message: 'original', createdAt: new Date().toISOString() };
			getAgentChatQueueMock.mockResolvedValue({ items: [item] });
			updateAgentQueuedMessageMock.mockRejectedValueOnce({ httpStatusCode: status });
			const hook = buildHook('thread-1');
			await hook.loadHistory();
			expect(await hook.updateQueuedMessage('1', 'unsaved')).toBe(
				status === 500 ? 'failed' : 'unavailable',
			);
			expect(hook.queuedMessages.value).toEqual([item]);
		},
	);

	it('restores pending inputs after reload and ignores a queue snapshot invalidated by removal', async () => {
		const item = { id: '1', message: 'Queued', createdAt: new Date().toISOString() };
		getAgentChatQueueMock.mockResolvedValue({ items: [item] });
		const hook = buildHook('thread-1');
		await hook.loadHistory();
		expect(hook.queuedMessages.value).toEqual([item]);
		const stale = Promise.withResolvers<{ items: (typeof item)[] }>();
		getAgentChatQueueMock.mockReturnValueOnce(stale.promise).mockResolvedValue({ items: [] });
		hook.refresh();
		await flushPromises();
		await hook.removeQueuedMessage('1');
		stale.resolve({ items: [item] });
		await flushPromises();
		expect(hook.queuedMessages.value).toEqual([]);
		expect(hook.messages.value).toEqual([]);
	});
});
