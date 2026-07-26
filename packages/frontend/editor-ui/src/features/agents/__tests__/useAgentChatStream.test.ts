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

vi.mock('../composables/useAgentApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../composables/useAgentApi')>();
	return {
		...actual,
		getChatMessages: (...args: unknown[]) => getChatMessagesMock(...args),
		getTestChatMessages: (...args: unknown[]) => getTestChatMessagesMock(...args),
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
