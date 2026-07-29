/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { APPROVAL_TOOL_NAME, N8N_CHAT_ACTION_TOOL_NAME, type AgentSseEvent } from '@n8n/api-types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

const getChatMessagesMock = vi.fn();
const getTestChatMessagesMock = vi.fn();
const cancelAgentChatRunMock = vi.fn();

vi.mock('../composables/useAgentApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../composables/useAgentApi')>();
	return {
		...actual,
		getChatMessages: (...args: unknown[]) => getChatMessagesMock(...args),
		getTestChatMessages: (...args: unknown[]) => getTestChatMessagesMock(...args),
		cancelAgentChatRun: (...args: unknown[]) => cancelAgentChatRunMock(...args),
	};
});

import { useAgentChatStream } from '../composables/useAgentChatStream';

/** Build a `Response` whose body streams the given events as SSE `data:` lines. */
function makeSseResponse(events: AgentSseEvent[]): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const ev of events) {
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
					encoder.encode(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')),
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
			for (const event of events) {
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
): { response: Response; close: () => void } {
	const encoder = new TextEncoder();
	let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
	let settled = false;
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			streamController = controller;
			for (const event of events) {
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
		close: () => {
			if (settled) return;
			settled = true;
			streamController?.close();
		},
	};
}

function buildHook(continueSessionId?: string) {
	return useAgentChatStream({
		projectId: ref('p1'),
		agentId: ref('a1'),
		...(continueSessionId ? { continueSessionId: ref(continueSessionId) } : {}),
	});
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
		cancelAgentChatRunMock.mockReset();
		cancelAgentChatRunMock.mockResolvedValue({ cancelled: true });
		getTestChatMessagesMock.mockReset();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.stubGlobal('localStorage', originalLocalStorage);
		vi.restoreAllMocks();
	});

	it('renders an approval card when preview chat suspends for tool approval', async () => {
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
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await nextTick();

		const assistant = hook.messages.value[1];
		expect(assistant.status).toBe('awaitingUser');
		expect(assistant.toolCalls?.[0].state).toBe('suspended');
		expect(assistant.interactive?.toolName).toBe(APPROVAL_TOOL_NAME);
		expect(assistant.interactive?.runId).toBe('run-approval');
		expect(assistant.interactive?.input).toEqual({
			type: 'approval',
			toolName: 'calculator',
			args: { input: '2 + 2' },
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

	it('blocks new messages while suspended-run cancellation is pending', async () => {
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
		const stop = hook.stopGenerating();
		await vi.waitFor(() => expect(cancelAgentChatRunMock).toHaveBeenCalled());
		expect(hook.isCancelling.value).toBe(true);

		await hook.sendMessage('start another run');

		expect(fetchMock).toHaveBeenCalledTimes(1);
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
		await hook.stopGenerating();

		expect(hook.messages.value[1].toolCalls).toEqual([
			expect.objectContaining({ toolCallId: 'tc-first', state: 'cancelled', canceled: true }),
			expect.objectContaining({ toolCallId: 'tc-second', state: 'cancelled', canceled: true }),
		]);
	});

	it('does not reopen a submitted HITL card when its resumed stream is stopped', async () => {
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
			.mockImplementationOnce(
				async (_url: string, init: RequestInit) =>
					await new Promise<Response>((_resolve, reject) => {
						init.signal?.addEventListener(
							'abort',
							() => reject(new DOMException('Aborted', 'AbortError')),
							{ once: true },
						);
					}),
			);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		const resume = hook.resume({
			runId: 'run-approval',
			toolCallId: 'tc-approval',
			resumeData: { approved: false },
		});
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		hook.stopGenerating();
		await resume;

		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls?.[0].state).toBe('done');
		expect(assistant.interactive?.resolvedAt).toBeDefined();
		expect(assistant.status).toBe('success');
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

	it('keeps the suspended card open when failed resume reconciliation returns 404', async () => {
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
				makeSseResponse([{ type: 'error', message: 'Resume failed' }]),
			) as unknown as typeof fetch;
		getTestChatMessagesMock.mockRejectedValue(
			Object.assign(new Error('thread not found'), { httpStatusCode: 404 }),
		);

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await hook.resume({
			runId: 'run-approval',
			toolCallId: 'tc-approval',
			resumeData: { approved: false },
		});

		expect(getTestChatMessagesMock).toHaveBeenCalled();
		expect(hook.messages.value[0].content).toBe('calculate 2 + 2');
		const assistant = hook.messages.value[1];
		expect(assistant.status).toBe('awaitingUser');
		expect(assistant.toolCalls?.[0].state).toBe('suspended');
		expect(assistant.interactive?.resolvedAt).toBeUndefined();
	});

	it('breaks out of the consume loop on `done` so isStreaming flips back to false', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'text-delta', id: 't-1', delta: 'hello' },
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('hi');
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

	it('marks active messages and tool calls as failed when the stream closes prematurely', async () => {
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
		await nextTick();

		const assistantMessages = hook.messages.value.filter((message) => message.role === 'assistant');
		expect(assistantMessages).toHaveLength(2);
		expect(assistantMessages[0].status).toBe('error');
		expect(assistantMessages[0].toolCalls?.[0].state).toBe('error');
		expect(assistantMessages[1]).toMatchObject({
			content: 'agents.chat.streamInterrupted',
			status: 'error',
		});
		expect(hook.isStreaming.value).toBe(false);
	});

	it('marks active messages and tool calls as failed when reading the stream throws', async () => {
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
		await nextTick();

		const assistantMessages = hook.messages.value.filter((message) => message.role === 'assistant');
		expect(assistantMessages).toHaveLength(2);
		expect(assistantMessages[0].status).toBe('error');
		expect(assistantMessages[0].toolCalls?.[0].state).toBe('error');
		expect(assistantMessages[1]).toMatchObject({
			content: 'agents.chat.streamInterrupted',
			status: 'error',
		});
		expect(hook.isStreaming.value).toBe(false);
	});

	it('preserves partial reasoning when the stream closes prematurely', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'reasoning-start', id: 'r-1' },
			{ type: 'reasoning-delta', id: 'r-1', delta: 'Checking the workflow' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('inspect this');
		await nextTick();

		const assistantMessages = hook.messages.value.filter((message) => message.role === 'assistant');
		expect(assistantMessages).toHaveLength(2);
		expect(assistantMessages[0]).toMatchObject({
			thinking: 'Checking the workflow',
			thinkingSegments: [
				expect.objectContaining({
					id: 'r-1',
					content: 'Checking the workflow',
					startTime: expect.any(Number),
					endTime: expect.any(Number),
				}),
			],
			status: 'error',
		});
		expect(assistantMessages[1].content).toBe('agents.chat.streamInterrupted');
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
		await nextTick();
		expect(hook.warnings.value).toHaveLength(1);

		globalThis.fetch = vi.fn(async () => makeSseResponse(withoutWarning)) as typeof fetch;
		await hook.sendMessage('run again');
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
		await nextTick();
		expect(hook.warnings.value).toHaveLength(2);

		hook.dismissWarning(0);
		expect(hook.warnings.value.map((w) => w.server)).toEqual(['s2']);
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
		const hook = useAgentChatStream({
			projectId: ref('p1'),
			agentId: ref('a1'),
		});
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

		const hook = useAgentChatStream({
			projectId: ref('p1'),
			agentId: ref('a1'),
			continueSessionId: ref('thread-1'),
		});
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

		const assistant = hook.messages.value.find((m) => m.role === 'assistant');
		expect(assistant?.content).toBe('Hello');
		expect(assistant?.executionId).toBe('exec-live-1');
	});
});
