/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import {
	APPROVAL_TOOL_NAME,
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	type AgentSseEvent,
} from '@n8n/api-types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

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

function buildHook(endpoint: 'build' | 'chat' = 'build') {
	return useAgentChatStream({
		projectId: ref('p1'),
		agentId: ref('a1'),
		endpoint: ref<'build' | 'chat'>(endpoint),
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

	it('renders an interactive ask_llm card and stamps the runId from the suspended event', async () => {
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					runId: 'run-42',
					toolName: ASK_LLM_TOOL_NAME,
					input: { purpose: 'main model' },
				},
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('hello');
		await nextTick();

		expect(hook.messages.value).toHaveLength(2);
		const assistant = hook.messages.value[1];
		expect(assistant.role).toBe('assistant');
		expect(assistant.status).toBe('awaitingUser');
		expect(assistant.toolCalls).toHaveLength(1);
		expect(assistant.toolCalls?.[0].state).toBe('suspended');
		expect(assistant.interactive?.toolName).toBe(ASK_LLM_TOOL_NAME);
		expect(assistant.interactive?.runId).toBe('run-42');
		expect(assistant.interactive?.resolvedValue).toBeUndefined();
		expect(assistant.interactive?.resolvedAt).toBeUndefined();
	});

	it('flips the card to resolved state when a follow-up `tool-result` carries the matching toolCallId', async () => {
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					runId: 'run-42',
					toolName: ASK_CREDENTIAL_TOOL_NAME,
					input: { purpose: 'Slack', credentialType: 'slackApi' },
				},
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-1',
				toolName: ASK_CREDENTIAL_TOOL_NAME,
				output: { credentialId: 'cred-1', credentialName: 'Acme Slack' },
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('add slack');
		await nextTick();

		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls?.[0].state).toBe('done');
		expect(assistant.status).toBe('success');
		expect(assistant.interactive?.resolvedAt).toBeDefined();
		expect(assistant.interactive?.resolvedValue).toEqual({
			credentialId: 'cred-1',
			credentialName: 'Acme Slack',
		});
	});

	it('does NOT lose the interactive card when tool-call-suspended arrives after a tool-call already ran', async () => {
		// SDK ordering: the `tool-call` event lands first, then
		// `tool-call-suspended` marks it as awaiting user input.
		const events: AgentSseEvent[] = [
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: ASK_LLM_TOOL_NAME,
				input: { purpose: 'main' },
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					runId: 'run-7',
					toolName: ASK_LLM_TOOL_NAME,
					input: { purpose: 'main' },
				},
			},
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('build me an agent');
		await nextTick();

		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls).toHaveLength(1);
		expect(assistant.toolCalls?.[0].state).toBe('suspended');
		expect(assistant.interactive?.runId).toBe('run-7');
		expect(assistant.status).toBe('awaitingUser');
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

		const hook = buildHook('chat');
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

		const hook = buildHook('chat');
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
			{ type: 'tool-input-start', toolCallId: 'tc-1', toolName: ASK_LLM_TOOL_NAME },
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: ASK_LLM_TOOL_NAME,
				input: { purpose: 'main' },
			},
			{ type: 'finish-step' },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-1',
				toolName: ASK_LLM_TOOL_NAME,
				startTime: 1_000,
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					runId: 'run-9',
					toolName: ASK_LLM_TOOL_NAME,
					input: { purpose: 'main' },
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
});
