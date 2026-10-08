import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import fc from 'fast-check';
import { APPROVAL_TOOL_NAME, N8N_CHAT_ACTION_TOOL_NAME, type AgentSseEvent } from '@n8n/api-types';

import { buildDisplayGroups } from '@/features/ai/shared/agentsChat/displayGroups';
import {
	convertDbMessages,
	findTailOpenInteractive,
} from '@/features/ai/shared/agentsChat/messageMappers';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import {
	READ_THEN_EDIT_TURN,
	orderedPartsArb,
	partEvents,
	text,
	toGroupShapes,
	toPersistedMessage,
	toRenderItems,
	toStreamEvents,
	withToolIdPrefix,
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

/** Sends one message. Each fetch answers with the next of `responses`. */
async function streamTurns(...responses: AgentSseEvent[][]) {
	const fetchMock = vi.fn();
	for (const events of responses) fetchMock.mockResolvedValueOnce(makeSseResponse(events));
	globalThis.fetch = fetchMock;
	const scope = effectScope();
	scopes.push(scope);
	const hook = scope.run(() => useAgentChatStream({ projectId: ref('p1'), agentId: ref('a1') }))!;
	await hook.sendMessage('Update the docs');
	await flushPromises();
	await nextTick();
	return { hook, fetchMock };
}

async function streamTurn(events: AgentSseEvent[]): Promise<ChatMessage[]> {
	const { hook } = await streamTurns(events);
	return hook.messages.value;
}

function historyMessages(parts: OrderedPart[]): ChatMessage[] {
	return convertDbMessages([
		{ id: 'user-1', role: 'user', content: [{ type: 'text', text: 'Update the docs' }] },
		toPersistedMessage(parts),
	]);
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
	vi.stubGlobal('localStorage', { getItem: vi.fn(() => '') });
});

afterEach(() => {
	for (const scope of scopes.splice(0)) scope.stop();
	globalThis.fetch = originalFetch;
	vi.unstubAllGlobals();
});

describe('useAgentChatStream — order of text and tool calls', () => {
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

/** One step that parks on a card, with the output before and after the card in the step. */
function parkedStep(
	card: { toolName: string; input: unknown; suspendInput: unknown },
	after: AgentSseEvent[],
	before: AgentSseEvent[] = [{ type: 'text-delta', id: 'text-1', delta: 'I will delete a.md.' }],
): AgentSseEvent[] {
	const { toolName } = card;
	return [
		{ type: 'start-step' },
		...before,
		{ type: 'tool-input-start', toolCallId: 'call-card', toolName },
		{ type: 'tool-call', toolCallId: 'call-card', toolName, input: card.input },
		...after,
		{ type: 'finish-step' },
		{
			type: 'tool-call-suspended',
			payload: { toolCallId: 'call-card', runId: 'run-1', toolName, input: card.suspendInput },
		},
		{ type: 'done', executionId: 'exec-1' },
	];
}

const approvalCard = {
	toolName: 'delete_file',
	input: { path: 'a.md' },
	suspendInput: { type: 'approval', toolName: 'delete_file', args: { path: 'a.md' } },
};

const questionCard = {
	toolName: N8N_CHAT_ACTION_TOOL_NAME,
	input: {
		action: 'respond',
		input: {
			message: { card: { components: [{ type: 'button', label: 'Delete', value: 'delete' }] } },
		},
	},
	suspendInput: { type: 'integration_action' },
};

const textAfterCard: AgentSseEvent[] = [
	{ type: 'text-delta', id: 'text-2', delta: 'Waiting for you.' },
];
const textAndToolAfterCard: AgentSseEvent[] = [
	...textAfterCard,
	{ type: 'tool-input-start', toolCallId: 'call-read', toolName: 'read_file' },
	{ type: 'tool-call', toolCallId: 'call-read', toolName: 'read_file', input: { path: 'b.md' } },
];

describe('useAgentChatStream — a card that output follows in the same step', () => {
	it.each([
		{ name: 'text → card → text', after: textAfterCard },
		{ name: 'text → card → text → tool', after: textAndToolAfterCard },
	])('keeps the approval of $name as the card of the last turn', async ({ after }) => {
		const { hook } = await streamTurns(parkedStep(approvalCard, after));
		const [, first, ...later] = hook.messages.value;

		expect(later.length).toBeGreaterThanOrEqual(2);
		for (const segment of later) expect(segment.segmentOf).toBe(first.id);
		expect(later[0].status).toBe('awaitingUser');
		expect(findTailOpenInteractive(hook.messages.value)).toMatchObject({
			toolName: APPROVAL_TOOL_NAME,
			toolCallId: 'call-card',
			runId: 'run-1',
		});
	});

	it('steers the open question when text follows it', async () => {
		const { hook, fetchMock } = await streamTurns(parkedStep(questionCard, textAfterCard), [
			{ type: 'done', executionId: 'exec-1' },
		]);

		expect(await hook.cancelAndSteer('Keep the file')).toBe('sent');
		expect(fetchMock).toHaveBeenLastCalledWith(
			'http://localhost:5678/projects/p1/agents/v2/a1/chat/resume',
			expect.objectContaining({
				body: JSON.stringify({
					runId: 'run-1',
					toolCallId: 'call-card',
					resumeData: { _type: 'agent.cancellation', message: 'Keep the file' },
				}),
			}),
		);
	});

	it('links the segments of one step, and starts a new output at a step boundary', async () => {
		const { hook } = await streamTurns([
			{ type: 'start-step' },
			{ type: 'text-delta', id: 'text-1', delta: 'Reading.' },
			{ type: 'tool-call', toolCallId: 'call-1', toolName: 'read_file', input: {} },
			{ type: 'finish-step' },
			{ type: 'tool-result', toolCallId: 'call-1', toolName: 'read_file', output: { ok: true } },
			{ type: 'start-step' },
			{ type: 'text-delta', id: 'text-2', delta: 'Done.' },
			{ type: 'finish-step' },
			{ type: 'done', executionId: 'exec-1' },
		]);
		const [, firstText, tools, secondText] = hook.messages.value;

		expect(firstText.segmentOf).toBeUndefined();
		expect(tools.segmentOf).toBe(firstText.id);
		expect(secondText.content).toBe('Done.');
		expect(secondText.segmentOf).toBeUndefined();
	});

	it('keeps the approval as the card of the last turn for any output around it', async () => {
		await fc.assert(
			fc.asyncProperty(orderedPartsArb, orderedPartsArb, async (before, after) => {
				const { hook } = await streamTurns(
					parkedStep(
						approvalCard,
						withToolIdPrefix(after, 'after-').flatMap((part, i) => partEvents(part, 100 + i)),
						withToolIdPrefix(before, 'before-').flatMap(partEvents),
					),
				);

				expect(findTailOpenInteractive(hook.messages.value)).toMatchObject({
					toolCallId: 'call-card',
					runId: 'run-1',
				});
			}),
			{ numRuns: 50 },
		);
	});
});
