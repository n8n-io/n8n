import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import type {
	AgentChatMessagesResponse,
	AgentPersistedMessageContentPart,
	AgentSseEvent,
} from '@n8n/api-types';

import { makeProposal } from '@/features/ai/instanceAi/components/automation/__tests__/automationProposalFixtures';
import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import { getMessageInteractives } from '@/features/ai/shared/agentsChat/messageMappers';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const { getChatMessages } = vi.hoisted(() => ({ getChatMessages: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		isConnected: true,
		addEventListener: () => () => {},
	}),
}));

vi.mock('../composables/useAgentApi', async (importOriginal) => ({
	...(await importOriginal<typeof import('../composables/useAgentApi')>()),
	getAgentChatQueue: vi.fn().mockResolvedValue({ items: [] }),
	getChatMessages,
}));

import { useAgentChatStream } from '../composables/useAgentChatStream';

// A model that counts its tool call ids from 1 gives a later card the id of an earlier call.
const REUSED_ID = 'toolu_1';
const PROPOSAL = 'propose_automation';

const suspendPayload = (workflowId: string) => ({
	requestId: `req-${workflowId}`,
	message: `Want "${workflowId}" to run automatically?`,
	severity: 'info',
	capability: true,
	automationProposal: makeProposal({ workflowId }),
});

const card = (
	workflowId: string,
	extra: Partial<AgentPersistedMessageContentPart> = {},
): AgentPersistedMessageContentPart => ({
	type: 'tool-call',
	toolName: PROPOSAL,
	toolCallId: REUSED_ID,
	input: { workflowId },
	suspendPayload: suspendPayload(workflowId),
	...extra,
});

const buildCall: AgentPersistedMessageContentPart = {
	type: 'tool-call',
	toolName: 'build-workflow',
	toolCallId: REUSED_ID,
	input: { name: 'Digest' },
	state: 'resolved',
	output: { workflowId: 'wf-A' },
};

const assistant = (id: string, part: AgentPersistedMessageContentPart) => ({
	id,
	role: 'assistant',
	executionStatus: 'success' as const,
	content: [part],
});

const user = (id: string, text: string) => ({
	id,
	role: 'user',
	content: [{ type: 'text', text }],
});

/** The history before the new turn. */
function before(earlier: AgentPersistedMessageContentPart): AgentChatMessagesResponse {
	return {
		messages: [user('u-1', 'Earlier'), assistant('a-1', earlier)],
		openSuspensions: [],
		activeExecutionId: null,
	};
}

/** The history after the turn: the server keeps the waiting card and its open suspension. */
function after(earlier: AgentPersistedMessageContentPart): AgentChatMessagesResponse {
	return {
		messages: [
			user('u-1', 'Earlier'),
			assistant('a-1', earlier),
			user('u-2', 'Turn it on'),
			assistant('a-2', card('wf-B', { state: 'pending' })),
		],
		openSuspensions: [
			{ toolCallId: REUSED_ID, runId: 'run-2', suspendPayload: suspendPayload('wf-B') },
		],
		activeExecutionId: null,
	};
}

/** The turn that proposes "wf-B" and ends while the card waits for the user. */
const TURN: AgentSseEvent[] = [
	{ type: 'execution-started', executionId: 'exec-2', sessionId: 'thread-1' },
	{ type: 'tool-call', toolCallId: REUSED_ID, toolName: PROPOSAL, input: { workflowId: 'wf-B' } },
	{
		type: 'tool-call-suspended',
		payload: {
			toolCallId: REUSED_ID,
			runId: 'run-2',
			toolName: PROPOSAL,
			input: suspendPayload('wf-B'),
		},
	},
	{ type: 'done', executionId: 'exec-2' },
];

function sseResponse(events: AgentSseEvent[]): Response {
	const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
	return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

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

type Hook = Awaited<ReturnType<typeof openChat>>;

/** The cards that wait for an answer, with the workflow that each proposes. */
const waitingCards = (hook: Hook) =>
	hook.messages.value.flatMap((message) =>
		getMessageInteractives(message)
			.filter(({ resolvedAt }) => resolvedAt === undefined)
			.map(({ runId, toolCallId }) => ({ messageId: message.id, runId, toolCallId })),
	);

const messageById = (hook: Hook, id: string) => {
	const message = hook.messages.value.find((entry) => entry.id === id);
	if (!message) throw new Error(`Message "${id}" is not in the chat`);
	return message;
};

describe('useAgentChatStream — a card with the id of an earlier call', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.stubGlobal('localStorage', { getItem: vi.fn(() => '') });
		globalThis.fetch = vi.fn().mockResolvedValue(sseResponse(TURN)) as unknown as typeof fetch;
	});

	afterEach(() => {
		for (const scope of scopes.splice(0)) scope.stop();
		globalThis.fetch = originalFetch;
		vi.unstubAllGlobals();
		vi.clearAllMocks();
		getChatMessages.mockReset();
	});

	it('keeps the waiting card after the turn ends, and keeps a stopped card with its id closed', async () => {
		const stopped = card('wf-A');
		getChatMessages.mockResolvedValueOnce(before(stopped)).mockResolvedValue(
			// The server marks the stopped card as cancelled once a later call uses its id.
			after({ ...stopped, canceled: true }),
		);
		const hook = await openChat();

		await hook.sendMessage('Turn it on');
		await flushPromises();

		// The read of the history after the turn replaced the streamed messages.
		expect(getChatMessages).toHaveBeenCalledTimes(2);
		expect(waitingCards(hook)).toEqual([
			{ messageId: 'a-2', runId: 'run-2', toolCallId: REUSED_ID },
		]);
		expect(messageById(hook, 'a-2').status).toBe(CHAT_MESSAGE_STATUS.AWAITING_USER);
		expect(messageById(hook, 'a-2').toolCalls?.[0]).toMatchObject({
			state: TOOL_CALL_STATE.SUSPENDED,
			runId: 'run-2',
			input: { workflowId: 'wf-B' },
		});
		expect(messageById(hook, 'a-1').toolCalls?.[0]).toMatchObject({
			state: TOOL_CALL_STATE.CANCELLED,
			canceled: true,
		});
		expect(messageById(hook, 'a-1').status).not.toBe(CHAT_MESSAGE_STATUS.AWAITING_USER);
	});

	it('keeps the waiting card after the turn ends when a settled call of another tool has its id', async () => {
		getChatMessages.mockResolvedValueOnce(before(buildCall)).mockResolvedValue(after(buildCall));
		const hook = await openChat();

		await hook.sendMessage('Turn it on');
		await flushPromises();

		expect(waitingCards(hook)).toEqual([
			{ messageId: 'a-2', runId: 'run-2', toolCallId: REUSED_ID },
		]);
		expect(messageById(hook, 'a-1').toolCalls?.[0]).toMatchObject({
			tool: 'build-workflow',
			state: TOOL_CALL_STATE.DONE,
			output: { workflowId: 'wf-A' },
		});
	});

	it('shows the waiting card after a reload, when the history holds the earlier call', async () => {
		getChatMessages.mockResolvedValue(after(buildCall));

		const hook = await openChat();

		expect(waitingCards(hook)).toEqual([
			{ messageId: 'a-2', runId: 'run-2', toolCallId: REUSED_ID },
		]);
		expect(messageById(hook, 'a-1').status).not.toBe(CHAT_MESSAGE_STATUS.AWAITING_USER);
	});
});
