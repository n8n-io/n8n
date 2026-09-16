/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, reactive, nextTick, effectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import {
	APPROVAL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
	type AgentChatMessagesResponse,
	type AgentSseEvent,
	type AgentChatQueueItem,
	type PushPayload,
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

const getChatMessagesMock = vi.fn();
const getTestChatMessagesMock = vi.fn();
const cancelAgentChatRunMock = vi.fn();

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
		sendAgentChatMessage: (...args: unknown[]) => postChatMock(...args),
		resumeAgentChat: (...args: unknown[]) => postChatMock(...args),
		getAgentChatQueue: (...args: unknown[]) => getQueueMock(...args),
		getChatMessages: (...args: unknown[]) => getChatMessagesMock(...args),
		getTestChatMessages: (...args: unknown[]) => getTestChatMessagesMock(...args),
		cancelAgentChatRun: (...args: unknown[]) => cancelAgentChatRunMock(...args),
	};
});

import { useAgentChatStream } from '../composables/useAgentChatStream';

const postChatMock = vi.fn();
const getQueueMock = vi.fn();
let liveQueue: AgentChatQueueItem[] = [];
let nextQueueId = 0;

function mockChatEvents(events: AgentSseEvent[], complete = true) {
	let send = (_event: PushPayload<'agentChatEvent'>['event']) => {};
	postChatMock.mockImplementationOnce(async (_context, projectId, agentId, payload) => {
		const id = String(++nextQueueId);
		const item: AgentChatQueueItem =
			'message' in payload
				? { id, kind: 'message', message: payload.message, attachments: [], status: 'processing' }
				: {
						id,
						kind: 'hitl',
						runId: payload.runId,
						toolCallId: payload.toolCallId,
						status: 'processing',
					};
		liveQueue.push(item);
		send = (event) => {
			if (event.type === 'done') liveQueue = liveQueue.filter((entry) => entry.id !== id);
			for (const listener of [...pushListeners])
				listener({
					type: 'agentChatEvent',
					data: {
						projectId,
						agentId,
						threadId: payload.sessionId ?? 'thread-1',
						queueId: id,
						clientRequestId: payload.clientRequestId,
						event,
					},
				});
		};
		send({ type: 'processing', item });
		for (const event of events) send(event);
		if (complete && !events.some((event) => event.type === 'done')) send({ type: 'done' });
		return { status: 'queued', sessionId: 'thread-1', item: { ...item, status: 'queued' } };
	});
	return { emit: (event: PushPayload<'agentChatEvent'>['event']) => send(event) };
}

beforeEach(() => {
	postChatMock.mockReset();
	getQueueMock.mockReset();
	getQueueMock.mockImplementation(async () => ({ items: [...liveQueue] }));
	liveQueue = [];
	nextQueueId = 0;
	getChatMessagesMock.mockReset();
	getTestChatMessagesMock.mockReset();
	getChatMessagesMock.mockRejectedValue({ httpStatusCode: 404 });
	getTestChatMessagesMock.mockRejectedValue({ httpStatusCode: 404 });
});

const hookScopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
	for (const scope of hookScopes.splice(0)) scope.stop();
});

function buildHook(
	continueSessionId?: string,
	onHistoryLoaded?: (count: number, hasQueueEntries: boolean, queueLoadSucceeded: boolean) => void,
) {
	const scope = effectScope();
	hookScopes.push(scope);
	return scope.run(() =>
		useAgentChatStream({
			projectId: ref('p1'),
			agentId: ref('a1'),
			...(continueSessionId ? { continueSessionId: ref(continueSessionId) } : {}),
			onHistoryLoaded,
		}),
	)!;
}

describe('useAgentChatStream — SDK-aligned event handling', () => {
	beforeEach(() => {
		cancelAgentChatRunMock.mockReset();
		cancelAgentChatRunMock.mockResolvedValue({ cancelled: true });
		getTestChatMessagesMock.mockReset();
	});

	afterEach(() => {
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
		mockChatEvents(events);

		const hook = buildHook();
		await hook.sendMessage('research this API');
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

	it('posts approval resumes to the chat resume endpoint in preview chat mode', async () => {
		mockChatEvents([
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
		]);
		mockChatEvents([
			{
				type: 'tool-result',
				toolCallId: 'tc-approval',
				toolName: 'calculator',
				output: { result: 4 },
			},
			{ type: 'done' },
		]);

		const hook = buildHook();
		await hook.sendMessage('calculate 2 + 2');
		await nextTick();

		await hook.resume({
			runId: 'run-approval',
			toolCallId: 'tc-approval',
			resumeData: { approved: true },
		});

		expect(postChatMock).toHaveBeenNthCalledWith(2, expect.anything(), 'p1', 'a1', {
			clientRequestId: expect.any(String),
			runId: 'run-approval',
			toolCallId: 'tc-approval',
			resumeData: { approved: true },
		});
		const assistant = hook.messages.value[1];
		expect(assistant.interactive?.resolvedValue).toEqual({ approved: true });
		expect(assistant.status).toBe('success');
	});

	// target: cancelling it would answer the wrong tool call and leave the
	// question the user is actually looking at open.

	it('cancels an idle suspended interaction and settles its UI state', async () => {
		mockChatEvents([
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
		]);

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

	it('settles every suspended tool call belonging to a cancelled run', async () => {
		mockChatEvents([
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
		]);

		const hook = buildHook();
		await hook.sendMessage('wait for both actions');
		await hook.stopGenerating();

		expect(hook.messages.value[1].toolCalls).toEqual([
			expect.objectContaining({ toolCallId: 'tc-first', state: 'cancelled', canceled: true }),
			expect.objectContaining({ toolCallId: 'tc-second', state: 'cancelled', canceled: true }),
		]);
	});

	it('finishes live rendering when done arrives', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'text-delta', id: 't-1', delta: 'hello' },
			{ type: 'done' },
		];
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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

	it('renders steering input between assistant segments', async () => {
		mockChatEvents([
			{ type: 'text-delta', id: 'before', delta: 'First answer' },
			{
				type: 'message',
				message: {
					id: 'queue-2',
					role: 'user',
					content: [{ type: 'text', text: 'Use the corrected value' }],
				},
			},
			{ type: 'text-delta', id: 'after', delta: 'Updated answer' },
			{ type: 'done' },
		]);

		const hook = buildHook();
		await hook.sendMessage('Start');

		expect(hook.messages.value.map(({ role, content, id }) => ({ role, content, id }))).toEqual([
			expect.objectContaining({ role: 'user', content: 'Start' }),
			expect.objectContaining({ role: 'assistant', content: 'First answer' }),
			{ role: 'user', content: 'Use the corrected value', id: 'queue-2' },
			expect.objectContaining({ role: 'assistant', content: 'Updated answer' }),
		]);
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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(withWarning);

		const hook = buildHook();
		await hook.sendMessage('run');
		await nextTick();
		expect(hook.warnings.value).toHaveLength(1);

		mockChatEvents(withoutWarning);
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
		mockChatEvents(events);

		const hook = buildHook();
		await hook.sendMessage('run');
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
		mockChatEvents(events);

		const hook = buildHook();
		await hook.sendMessage('run');
		hook.dismissWarning(0);

		mockChatEvents(events);
		await hook.sendMessage('run again');

		expect(hook.warnings.value).toHaveLength(0);

		const refreshedHook = buildHook();
		mockChatEvents(events);
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
		mockChatEvents(firstEvents);
		mockChatEvents(secondEvents);

		const hook = buildHook();
		await hook.sendMessage('run');
		hook.dismissWarning(0);

		await hook.sendMessage('run again');

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
		mockChatEvents(events);

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
	beforeEach(() => {
		getChatMessagesMock.mockReset();
		getTestChatMessagesMock.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reports when the initial queue load fails', async () => {
		const onHistoryLoaded = vi.fn();
		getQueueMock.mockRejectedValueOnce(new Error('Queue unavailable'));

		const hook = buildHook('thread-1', onHistoryLoaded);
		await hook.loadHistory();

		expect(onHistoryLoaded).toHaveBeenCalledWith(0, false, false);
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
});

describe('useAgentChatStream — done executionId', () => {
	it('stamps executionId from done onto minted messages', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'text-start', id: 't1' },
			{ type: 'text-delta', id: 't1', delta: 'Hello' },
			{ type: 'text-end', id: 't1' },
			{ type: 'done', sessionId: 'thread-1', executionId: 'exec-live-1' },
		];
		mockChatEvents(events);

		const hook = buildHook();
		await hook.sendMessage('hi');

		const assistant = hook.messages.value.find((m) => m.role === 'assistant');
		expect(assistant?.content).toBe('Hello');
		expect(assistant?.executionId).toBe('exec-live-1');
	});
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
		mockChatEvents(events);

		const hook = buildHook();
		await hook.sendMessage('delegate');
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
		mockChatEvents(events);

		const hook = buildHook();
		await hook.sendMessage('delegate');
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
		mockChatEvents(events);

		const hook = buildHook();
		await hook.sendMessage('hi');
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
		mockChatEvents(events);

		const hook = buildHook();
		await hook.sendMessage('delegate');
		await nextTick();

		expect(hook.messages.value[1].toolCalls?.[0].childProgress?.text).toBe('live');
		expect(hook.messages.value[1].toolCalls?.[0].output).toEqual({
			status: 'completed',
			answer: 'done',
		});
	});
});

describe('useAgentChatStream — stuck/desync recovery', () => {
	beforeEach(() => {
		cancelAgentChatRunMock.mockReset();
		cancelAgentChatRunMock.mockResolvedValue({ cancelled: true });
		getTestChatMessagesMock.mockReset();
	});

	afterEach(() => {
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
		mockChatEvents(events);

		const hook = buildHook();
		await hook.sendMessage('go');
		await nextTick();

		expect(hook.isStreaming.value).toBe(false);
		// Tool would otherwise keep pulsing as `running` — it must settle.
		expect(hook.messages.value[1].toolCalls?.[0].state).toBe('done');
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
		getChatMessagesMock.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
		mockChatEvents([{ type: 'text-delta', id: 'reply', delta: 'new reply' }, { type: 'done' }]);
		const { hook, dispose } = scopedHook('thread-1');
		try {
			emitPush(update());
			await flushPromises();
			await hook.sendMessage('hello');
			stale.resolve(history('old reply'));
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual(['hello', 'new reply']);
			expect(getChatMessagesMock).toHaveBeenCalledTimes(2);
			fresh.resolve(history('new reply'));
			await flushPromises();
			expect(hook.messages.value.map((message) => message.content)).toEqual(['new reply']);
		} finally {
			dispose();
		}
	});

	it('discards a snapshot requested during a stream that finishes before the response', async () => {
		const stale = Promise.withResolvers<ReturnType<typeof history>>();
		const fresh = Promise.withResolvers<ReturnType<typeof history>>();
		getChatMessagesMock.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
		const stream = mockChatEvents([{ type: 'text-delta', id: 'reply', delta: 'new reply' }], false);
		const { hook, dispose } = scopedHook('thread-1');
		try {
			const sending = hook.sendMessage('hello');
			await flushPromises();
			const loading = hook.loadHistory();
			await vi.waitFor(() => expect(getChatMessagesMock).toHaveBeenCalledTimes(1));
			stream.emit({ type: 'done' });
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
		}
	});

	it('refreshes after a local stream ends when pushes arrived during the stream', async () => {
		const stream = mockChatEvents([], false);
		const { hook, dispose } = scopedHook('thread-1');
		try {
			const sending = hook.sendMessage('hello');
			await flushPromises();
			emitPush(update());
			await flushPromises();
			expect(getChatMessagesMock).not.toHaveBeenCalled();
			stream.emit({ type: 'done' });
			await sending;
			await flushPromises();
			expect(getChatMessagesMock).toHaveBeenCalledTimes(1);
		} finally {
			dispose();
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

	it('discards a snapshot from a previous session', async () => {
		const stale = Promise.withResolvers<ReturnType<typeof history>>();
		getChatMessagesMock.mockReturnValueOnce(stale.promise).mockResolvedValue(history('current'));
		const scope = effectScope();
		const threadId = ref('thread-1');
		const hook = scope.run(() =>
			useAgentChatStream({ projectId: ref('p1'), agentId: ref('a1'), continueSessionId: threadId }),
		)!;
		const loading = hook.loadHistory();
		await vi.waitFor(() => expect(getChatMessagesMock).toHaveBeenCalledTimes(1));
		threadId.value = 'thread-2';
		await flushPromises();
		stale.resolve(history('old session'));
		await loading;
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
		let release!: () => void;
		getTestChatMessagesMock.mockReturnValueOnce(
			new Promise((resolve) => {
				release = () =>
					resolve({ messages: [{ role: 'user', content: 'stale' }], openSuspensions: [] });
			}),
		);

		emitPush(update());
		await flushPromises();

		// A send begins before the refetch resolves.
		mockChatEvents([], false);
		await hook.sendMessage('live');
		release();
		await flushPromises();

		expect(hook.messages.value.map(({ content }) => content)).toEqual(['live']);
		dispose();
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
