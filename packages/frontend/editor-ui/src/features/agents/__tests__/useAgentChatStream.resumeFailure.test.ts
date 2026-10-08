/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import type { AgentSseEvent } from '@n8n/api-types';
import type { AgentResumeFailure } from '../utils/chat-rejection';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const { showError, getTestChatMessages } = vi.hoisted(() => ({
	showError: vi.fn(),
	getTestChatMessages: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		isConnected: false,
		addEventListener: () => () => {},
	}),
}));

vi.mock('../composables/useAgentApi', async (importOriginal) => ({
	...(await importOriginal<typeof import('../composables/useAgentApi')>()),
	getAgentChatQueue: vi.fn().mockResolvedValue({ items: [] }),
	getTestChatMessages,
}));

import { useAgentChatStream } from '../composables/useAgentChatStream';

const RESUME = {
	runId: 'run-1',
	toolCallId: 'tc-1',
	resumeData: { kind: 'approval', approved: true },
};

function sseResponse(events: AgentSseEvent[]): Response {
	const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
	return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function errorResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

const scopes: Array<ReturnType<typeof effectScope>> = [];

function buildHook(onResumeFailed: (failure: AgentResumeFailure) => void) {
	const scope = effectScope();
	scopes.push(scope);
	const hook = scope.run(() =>
		useAgentChatStream({ projectId: ref('p1'), agentId: ref('a1'), onResumeFailed }),
	);
	if (!hook) throw new Error('The effect scope is not active');
	return hook;
}

describe('useAgentChatStream — card answers that do not go through', () => {
	const originalFetch = globalThis.fetch;
	let fetchMock: ReturnType<typeof vi.fn>;
	const calls: string[] = [];

	beforeEach(() => {
		calls.length = 0;
		vi.stubGlobal('localStorage', { getItem: vi.fn(() => '') });
		fetchMock = vi.fn();
		globalThis.fetch = fetchMock as unknown as typeof fetch;
		getTestChatMessages.mockImplementation(async () => {
			calls.push('history');
			return { messages: [], openSuspensions: [], activeExecutionId: null };
		});
	});

	afterEach(() => {
		for (const scope of scopes.splice(0)) scope.stop();
		globalThis.fetch = originalFetch;
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('reports a 409 with the name of the user who answered first, after it read the history again', async () => {
		fetchMock.mockResolvedValue(
			errorResponse(409, {
				code: 409,
				message: 'This request was already answered',
				meta: { answeredBy: { name: 'Alice Owner' } },
			}),
		);
		const onResumeFailed = vi.fn(() => calls.push('reported'));
		const hook = buildHook(onResumeFailed);

		await hook.resume(RESUME);

		expect(onResumeFailed).toHaveBeenCalledWith({
			toolCallId: 'tc-1',
			status: 409,
			message: 'This request was already answered',
			answeredBy: 'Alice Owner',
		});
		expect(calls).toEqual(['history', 'reported']);
	});

	it('shows the reason of a refusal in the transcript when the history cannot be read', async () => {
		fetchMock.mockResolvedValue(
			errorResponse(403, { code: 403, message: 'Only editors in Marketing can approve this.' }),
		);
		getTestChatMessages.mockRejectedValue(new Error('offline'));
		const onResumeFailed = vi.fn();
		const hook = buildHook(onResumeFailed);

		await hook.resume(RESUME);

		expect(onResumeFailed).toHaveBeenCalledWith({
			toolCallId: 'tc-1',
			status: 403,
			message: 'Only editors in Marketing can approve this.',
		});
		expect(hook.messages.value.map((message) => message.content)).toContain(
			'Only editors in Marketing can approve this.',
		);
	});

	it('reports a stream error without a status, as the loser of a race gets it', async () => {
		fetchMock.mockResolvedValue(
			sseResponse([{ type: 'error', message: 'This action is no longer waiting for input' }]),
		);
		const onResumeFailed = vi.fn();
		const hook = buildHook(onResumeFailed);

		await hook.resume(RESUME);

		expect(onResumeFailed).toHaveBeenCalledWith({ toolCallId: 'tc-1' });
	});

	it('reports nothing for an answer that went through', async () => {
		fetchMock.mockResolvedValue(
			sseResponse([
				{ type: 'execution-started', executionId: 'e-1', sessionId: 's-1' },
				{ type: 'done' },
			]),
		);
		const onResumeFailed = vi.fn();
		const hook = buildHook(onResumeFailed);

		await hook.resume(RESUME);

		expect(onResumeFailed).not.toHaveBeenCalled();
	});

	it('reports nothing for a steering message that cancels a card', async () => {
		fetchMock.mockResolvedValue(errorResponse(409, { code: 409, message: 'Taken' }));
		const onResumeFailed = vi.fn();
		const hook = buildHook(onResumeFailed);

		await hook.resume({ runId: 'run-1', toolCallId: 'tc-1', cancelled: true, text: 'Stop' });

		expect(onResumeFailed).not.toHaveBeenCalled();
	});

	it('shows the server reason when it refuses a new message', async () => {
		fetchMock.mockResolvedValue(
			errorResponse(403, { code: 403, message: 'Only Alice Owner can send messages here.' }),
		);
		const hook = buildHook(vi.fn());

		await hook.sendMessage('Hello');

		expect(showError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Only Alice Owner can send messages here.' }),
			'agents.chat.queue.sendError',
		);
	});

	it('falls back to the status text when the refusal has no readable body', async () => {
		fetchMock.mockResolvedValue(
			new Response('<html />', { status: 502, statusText: 'Bad Gateway' }),
		);
		const onResumeFailed = vi.fn();
		const hook = buildHook(onResumeFailed);
		getTestChatMessages.mockRejectedValue(new Error('offline'));

		await hook.resume(RESUME);

		expect(onResumeFailed).toHaveBeenCalledWith({ toolCallId: 'tc-1', status: 502 });
		expect(hook.messages.value.map((message) => message.content)).toContain('Bad Gateway');
	});
});
