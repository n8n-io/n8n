import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import type { AgentChatMessagesResponse, AgentSseEvent } from '@n8n/api-types';

import { makeProposal } from '@/features/ai/instanceAi/components/automation/__tests__/automationProposalFixtures';
import { getMessageInteractive } from '@/features/ai/shared/agentsChat/messageMappers';
import { keepsResolvedCard } from '@/features/ai/shared/agentsChat/resolvedCards';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const { getChatMessages, pushListeners } = vi.hoisted(() => ({
	getChatMessages: vi.fn(),
	pushListeners: [] as Array<(event: unknown) => void>,
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		isConnected: true,
		addEventListener: (handler: (event: unknown) => void) => {
			pushListeners.push(handler);
			return () => pushListeners.splice(pushListeners.indexOf(handler), 1);
		},
	}),
}));

vi.mock('../composables/useAgentApi', async (importOriginal) => ({
	...(await importOriginal<typeof import('../composables/useAgentApi')>()),
	getAgentChatQueue: vi.fn().mockResolvedValue({ items: [] }),
	getChatMessages,
}));

import { useAgentChatStream } from '../composables/useAgentChatStream';

/** The suspend payload of `propose_automation`, as the server sends it. */
const SUSPEND = {
	requestId: 'req-auto',
	message: 'Want "Morning digest" to run automatically?',
	severity: 'info',
	capability: true,
	automationProposal: makeProposal(),
};
const TOOL_CALL = {
	type: 'tool-call' as const,
	toolCallId: 'tc-auto',
	toolName: 'propose_automation',
	input: { workflowId: 'wf-1' },
	suspendPayload: SUSPEND,
};
const TURN_ON = { kind: 'capabilityDecision', approved: true, values: { activate: true } };
const SAVE = { kind: 'capabilityDecision', approved: true, values: { activate: false } };
const TOOL_RESULT = { workflowId: 'wf-1', url: '/workflow/wf-1', active: true, kept: true };
const RESUME = { runId: 'run-1', toolCallId: 'tc-auto', resumeData: TURN_ON };

/** The history of the chat: the card waits for an answer. */
const WAITING: AgentChatMessagesResponse = {
	messages: [{ id: 'msg-1', role: 'assistant', executionStatus: 'success', content: [TOOL_CALL] }],
	openSuspensions: [{ toolCallId: 'tc-auto', runId: 'run-1', suspendPayload: SUSPEND }],
	activeExecutionId: null,
};

/** The history after the turn: the server stores the tool result, not the answer. */
function answered(output: unknown): AgentChatMessagesResponse {
	return {
		messages: [
			{
				id: 'msg-1',
				role: 'assistant',
				executionStatus: 'success',
				content: [{ ...TOOL_CALL, state: 'resolved', output }],
			},
		],
		openSuspensions: [],
		activeExecutionId: null,
	};
}

function sseResponse(events: AgentSseEvent[]): Response {
	const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
	return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const TURN: AgentSseEvent[] = [
	{ type: 'execution-started', executionId: 'exec-2', sessionId: 'thread-1' },
	{
		type: 'tool-result',
		toolCallId: 'tc-auto',
		toolName: 'propose_automation',
		output: TOOL_RESULT,
	},
	{ type: 'done', executionId: 'exec-2' },
];

const scopes: Array<ReturnType<typeof effectScope>> = [];

async function openChat() {
	const scope = effectScope();
	scopes.push(scope);
	const hook = scope.run(() =>
		useAgentChatStream({
			projectId: ref('p1'),
			agentId: ref('a1'),
			continueSessionId: ref('thread-1'),
		}),
	);
	if (!hook) throw new Error('The effect scope is not active');
	await hook.loadHistory();
	return hook;
}

function automationCard(hook: Awaited<ReturnType<typeof openChat>>) {
	const message = hook.messages.value.find((entry) => entry.id === 'msg-1');
	const card = message && getMessageInteractive(message, 'tc-auto');
	if (!card) throw new Error('The automation card is not in the chat');
	return card;
}

function pushExecutionUpdate() {
	for (const listener of [...pushListeners]) {
		listener({
			type: 'agentExecutionUpdated',
			data: { projectId: 'p1', agentId: 'a1', threadId: 'thread-1', executionId: 'exec-2' },
		});
	}
}

describe('useAgentChatStream — answers of this session', () => {
	const originalFetch = globalThis.fetch;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.stubGlobal('localStorage', { getItem: vi.fn(() => '') });
		fetchMock = vi.fn();
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		getChatMessages.mockResolvedValueOnce(WAITING).mockResolvedValue(answered(TOOL_RESULT));
	});

	afterEach(() => {
		for (const scope of scopes.splice(0)) scope.stop();
		globalThis.fetch = originalFetch;
		vi.unstubAllGlobals();
		vi.clearAllMocks();
		getChatMessages.mockReset();
	});

	it('keeps an answered automation card through the history reads after the turn', async () => {
		fetchMock.mockResolvedValue(sseResponse(TURN));
		const hook = await openChat();
		expect(automationCard(hook).resolvedAt).toBeUndefined();

		await hook.resume(RESUME);
		await flushPromises();

		// The stream end read the history again: the step holds the result, the card the answer.
		expect(getChatMessages).toHaveBeenCalledTimes(2);
		expect(hook.messages.value[0].toolCalls?.[0].output).toEqual(TOOL_RESULT);
		expect(automationCard(hook).resolvedValue).toEqual(TURN_ON);
		expect(keepsResolvedCard(automationCard(hook))).toBe(true);

		pushExecutionUpdate();
		await flushPromises();

		expect(getChatMessages).toHaveBeenCalledTimes(3);
		expect(automationCard(hook).resolvedValue).toEqual(TURN_ON);
		expect(keepsResolvedCard(automationCard(hook))).toBe(true);
	});

	it('hides the card after a reload, when no answer of this session is known', async () => {
		getChatMessages.mockReset().mockResolvedValue(answered(TOOL_RESULT));
		const hook = await openChat();

		expect(automationCard(hook).resolvedValue).toEqual(TOOL_RESULT);
		expect(keepsResolvedCard(automationCard(hook))).toBe(false);
	});

	it('does not put back an answer that the server refused', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ code: 409, message: 'This request was already answered' }), {
				status: 409,
				headers: { 'Content-Type': 'application/json' },
			}),
		);
		// Someone else answered first, with "Save".
		getChatMessages
			.mockReset()
			.mockResolvedValueOnce(WAITING)
			.mockResolvedValue(answered({ ...TOOL_RESULT, active: false }));
		const hook = await openChat();

		await hook.resume(RESUME);
		await flushPromises();
		pushExecutionUpdate();
		await flushPromises();

		expect(automationCard(hook).resolvedValue).toEqual({ ...TOOL_RESULT, active: false });
		expect(keepsResolvedCard(automationCard(hook))).toBe(false);
	});

	it.each([
		['with a start event', TURN.slice(0, 2)],
		// The n8n Assistant streams the turn of an answer without a start event.
		['without a start event', TURN.slice(1, 2)],
	])(
		'keeps the answer when the turn fails after the tool ran (%s)',
		async (_name, before: AgentSseEvent[]) => {
			fetchMock.mockResolvedValue(
				sseResponse([...before, { type: 'error', message: 'The model provider failed' }]),
			);
			const hook = await openChat();

			await hook.resume(RESUME);
			await flushPromises();

			expect(hook.messages.value[0].toolCalls?.[0].output).toEqual(TOOL_RESULT);
			expect(automationCard(hook).resolvedValue).toEqual(TURN_ON);
			expect(keepsResolvedCard(automationCard(hook))).toBe(true);

			pushExecutionUpdate();
			await flushPromises();

			expect(automationCard(hook).resolvedValue).toEqual(TURN_ON);
			expect(keepsResolvedCard(automationCard(hook))).toBe(true);
		},
	);

	it('does not put back an answer when the stream fails before the server takes it', async () => {
		fetchMock.mockResolvedValue(
			sseResponse([{ type: 'error', message: 'This action is no longer waiting for input' }]),
		);
		// Someone else answered first, with "Save".
		getChatMessages
			.mockReset()
			.mockResolvedValueOnce(WAITING)
			.mockResolvedValue(answered({ ...TOOL_RESULT, active: false }));
		const hook = await openChat();

		await hook.resume(RESUME);
		await flushPromises();
		pushExecutionUpdate();
		await flushPromises();

		expect(automationCard(hook).resolvedValue).toEqual({ ...TOOL_RESULT, active: false });
		expect(keepsResolvedCard(automationCard(hook))).toBe(false);
	});

	it('opens the card again when the history says that it still waits', async () => {
		fetchMock.mockResolvedValue(
			sseResponse([{ type: 'error', message: 'This action is no longer waiting for input' }]),
		);
		getChatMessages.mockReset().mockResolvedValue(WAITING);
		const hook = await openChat();

		await hook.resume(RESUME);
		await flushPromises();

		expect(automationCard(hook).resolvedAt).toBeUndefined();
		expect(automationCard(hook).resolvedValue).toBeUndefined();
	});

	it('keeps the latest answer when the user answers the same card again', async () => {
		fetchMock
			.mockResolvedValueOnce(new Response('{}', { status: 503, statusText: 'Busy' }))
			.mockResolvedValue(sseResponse(TURN));
		getChatMessages
			.mockReset()
			.mockResolvedValueOnce(WAITING)
			.mockResolvedValueOnce(WAITING)
			.mockResolvedValue(answered({ ...TOOL_RESULT, active: false }));
		const hook = await openChat();

		await hook.resume(RESUME);
		await flushPromises();
		await hook.resume({ ...RESUME, resumeData: SAVE });
		await flushPromises();

		expect(automationCard(hook).resolvedValue).toEqual(SAVE);
	});
});
