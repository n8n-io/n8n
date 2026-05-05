/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { ASK_CREDENTIAL_TOOL_NAME, ASK_LLM_TOOL_NAME, type AgentSseEvent } from '@n8n/api-types';

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

function buildHook() {
	return useAgentChatStream({
		projectId: ref('p1'),
		agentId: ref('a1'),
		endpoint: ref<'build' | 'chat'>('build'),
	});
}

describe('useAgentChatStream — SDK-aligned event handling', () => {
	let originalFetch: typeof fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
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
			{ type: 'tool-execution-start', toolCallId: 'tc-1', toolName: ASK_LLM_TOOL_NAME },
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

	it('renders working-memory-update as a completed memory tool step', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'working-memory-update', toolName: 'update_working_memory' },
			{ type: 'done' },
		];
		globalThis.fetch = vi.fn(async () => makeSseResponse(events)) as typeof fetch;

		const hook = buildHook();
		await hook.sendMessage('remember this');
		await nextTick();

		const assistant = hook.messages.value[1];
		expect(assistant.toolCalls).toEqual([
			expect.objectContaining({
				tool: 'update_working_memory',
				state: 'done',
			}),
		]);
		expect(assistant.status).toBe('success');
	});
});
