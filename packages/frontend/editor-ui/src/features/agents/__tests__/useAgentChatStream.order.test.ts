import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import fc from 'fast-check';
import type { AgentSseEvent } from '@n8n/api-types';

import { buildDisplayGroups } from '@/features/ai/shared/agentsChat/displayGroups';
import { convertDbMessages } from '@/features/ai/shared/agentsChat/messageMappers';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import {
	READ_THEN_EDIT_TURN,
	orderedPartsArb,
	text,
	toGroupShapes,
	toPersistedMessage,
	toRenderItems,
	toStreamEvents,
	type OrderedPart,
} from '@/features/ai/shared/agentsChat/__tests__/fixtures/orderedParts';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		isConnected: false,
		addEventListener: () => () => {},
	}),
}));

vi.mock('../composables/useAgentApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../composables/useAgentApi')>();
	return {
		...actual,
		getAgentChatQueue: vi.fn().mockResolvedValue({ items: [] }),
		getChatMessages: vi.fn().mockRejectedValue({ httpStatusCode: 404 }),
		getTestChatMessages: vi.fn().mockRejectedValue({ httpStatusCode: 404 }),
	};
});

import { useAgentChatStream } from '../composables/useAgentChatStream';

/** A `Response` whose body streams the events as SSE `data:` lines, after the admission event. */
function makeSseResponse(events: AgentSseEvent[]): Response {
	const encoder = new TextEncoder();
	const admitted: AgentSseEvent[] = [
		{ type: 'execution-started', executionId: 'exec-1', sessionId: 'thread-1' },
		...events,
	];
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const event of admitted) {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
			}
			controller.close();
		},
	});
	return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const scopes: Array<ReturnType<typeof effectScope>> = [];

async function streamTurn(events: AgentSseEvent[]): Promise<ChatMessage[]> {
	globalThis.fetch = vi.fn(async () => makeSseResponse(events));
	const scope = effectScope();
	scopes.push(scope);
	const hook = scope.run(() => useAgentChatStream({ projectId: ref('p1'), agentId: ref('a1') }))!;
	await hook.sendMessage('Update the docs');
	await flushPromises();
	await nextTick();
	return hook.messages.value;
}

function historyMessages(parts: OrderedPart[]): ChatMessage[] {
	return convertDbMessages([
		{ id: 'user-1', role: 'user', content: [{ type: 'text', text: 'Update the docs' }] },
		toPersistedMessage(parts),
	]);
}

describe('useAgentChatStream — order of text and tool calls', () => {
	let originalFetch: typeof fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		vi.stubGlobal('localStorage', { getItem: vi.fn(() => '') });
	});

	afterEach(() => {
		for (const scope of scopes.splice(0)) scope.stop();
		globalThis.fetch = originalFetch;
		vi.unstubAllGlobals();
	});

	it('shows text before the tool calls that follow it in the same step', async () => {
		const messages = await streamTurn(toStreamEvents(READ_THEN_EDIT_TURN));
		const assistant = messages.filter((message) => message.role === 'assistant');

		expect(assistant.map((message) => message.content)).toEqual([
			"I'll read the instructions first.",
			'',
			'Now I will update the two files.',
			'',
		]);
		expect(toRenderItems(buildDisplayGroups(messages))).toEqual([
			{ kind: 'text', text: 'Update the docs' },
			{ kind: 'text', text: "I'll read the instructions first." },
			{ kind: 'tools', toolCallIds: ['read-1', 'read-2', 'read-3'] },
			{ kind: 'text', text: 'Now I will update the two files.' },
			{ kind: 'tools', toolCallIds: ['edit-1', 'edit-2'] },
		]);
	});

	it('renders the same groups live as after a reload', async () => {
		const parts = [...READ_THEN_EDIT_TURN, text('Both files are updated.')];
		const stepEnds = parts.map((part) => part.kind === 'tool');

		const live = await streamTurn(toStreamEvents(parts, stepEnds));

		expect(toGroupShapes(buildDisplayGroups(live))).toEqual(
			toGroupShapes(buildDisplayGroups(historyMessages(parts))),
		);
		expect(toGroupShapes(buildDisplayGroups(live)).map((group) => group.kind)).toEqual([
			'message',
			'toolRun',
			'toolRun',
		]);
	});

	it('settles each tool call in place when its result arrives after the step', async () => {
		const parts = READ_THEN_EDIT_TURN;
		const live = await streamTurn(
			toStreamEvents(
				parts,
				parts.map(() => true),
			),
		);
		const toolCalls = live.flatMap((message) => message.toolCalls ?? []);

		expect(toolCalls.map((call) => call.toolCallId)).toEqual([
			'read-1',
			'read-2',
			'read-3',
			'edit-1',
			'edit-2',
		]);
		for (const call of toolCalls) expect(call.state).toBe('done');
	});

	it('keeps a finalised tool call in its message when text arrives before the call ends', async () => {
		const live = await streamTurn([
			{ type: 'start-step' },
			{ type: 'tool-input-start', toolCallId: 'call-1', toolName: 'read_file' },
			{ type: 'text-delta', id: 'text-1', delta: 'Reading the file.' },
			{ type: 'tool-call', toolCallId: 'call-1', toolName: 'read_file', input: { path: 'a.md' } },
			{ type: 'finish-step' },
			{ type: 'done', executionId: 'exec-1' },
		]);
		const calls = live.flatMap((message) => message.toolCalls ?? []);

		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({ toolCallId: 'call-1', input: { path: 'a.md' } });
	});

	it('renders the same groups live and after a reload for any turn', async () => {
		await fc.assert(
			fc.asyncProperty(
				orderedPartsArb,
				fc.array(fc.boolean(), { minLength: 12, maxLength: 12 }),
				async (parts, stepEnds) => {
					const live = await streamTurn(toStreamEvents(parts, stepEnds));
					expect(toGroupShapes(buildDisplayGroups(live))).toEqual(
						toGroupShapes(buildDisplayGroups(historyMessages(parts))),
					);
				},
			),
			{ numRuns: 100 },
		);
	});
});
