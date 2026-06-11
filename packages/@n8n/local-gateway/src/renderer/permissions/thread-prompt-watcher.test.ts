// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetPermissionPromptsForTests, permissionPromptState } from './permission-prompt-store';
import { createThreadPromptWatcher } from './thread-prompt-watcher';
import type { InstanceAiEvent, InstanceAiRichMessagesResponse } from '../../shared/types';
import type { ThreadListener } from '../services/thread-client';

function makeSnapshot(
	overrides: Partial<InstanceAiRichMessagesResponse> = {},
): InstanceAiRichMessagesResponse {
	return { threadId: 't1', messages: [], nextEventId: 8, ...overrides };
}

/** A snapshot message whose agent tree carries one pending confirmation. */
function makePendingMessage(requestId: string) {
	return {
		id: 'm1',
		role: 'assistant' as const,
		createdAt: '2026-06-11T00:00:00Z',
		content: '',
		reasoning: '',
		isStreaming: true,
		runIds: ['run-1'],
		agentTree: {
			agentId: 'a1',
			role: 'orchestrator',
			status: 'active' as const,
			textContent: '',
			reasoning: '',
			toolCalls: [
				{
					toolCallId: 'tool-1',
					toolName: 'computer_use',
					args: {},
					isLoading: true,
					confirmation: { requestId, severity: 'warning' as const, message: 'Allow?' },
				},
			],
			children: [],
			timeline: [],
		},
	};
}

function confirmationRequestEvent(requestId: string, runId = 'run-1'): InstanceAiEvent {
	return {
		type: 'confirmation-request',
		runId,
		agentId: 'a1',
		payload: {
			requestId,
			toolCallId: `tool-${requestId}`,
			toolName: 'computer_use',
			args: {},
			severity: 'warning',
			message: 'Allow?',
		},
	} as InstanceAiEvent;
}

function makeClient(snapshot: InstanceAiRichMessagesResponse = makeSnapshot()) {
	const listeners = new Map<string, ThreadListener>();
	const client = {
		get: vi.fn(async () => await Promise.resolve(snapshot)),
		listen: vi.fn((threadId: string, listener: ThreadListener) => {
			listeners.set(threadId, listener);
		}),
		unlisten: vi.fn((threadId: string, listener: ThreadListener) => {
			if (listeners.get(threadId) === listener) listeners.delete(threadId);
		}),
	};
	return {
		client,
		emit: (threadId: string, event: InstanceAiEvent) => listeners.get(threadId)?.(event),
	};
}

/** Flush the watcher's async snapshot-seed step. */
async function settle(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

const promptIds = () => permissionPromptState.prompts.map((prompt) => prompt.id);

describe('createThreadPromptWatcher', () => {
	beforeEach(() => {
		__resetPermissionPromptsForTests();
	});

	it('seeds pending prompts from the snapshot and listens from its cursor', async () => {
		const { client } = makeClient(makeSnapshot({ messages: [makePendingMessage('req-1')] }));
		const watcher = createThreadPromptWatcher(client);

		watcher.watchThread('t1');
		await settle();

		expect(promptIds()).toEqual(['instance:req-1']);
		expect(client.listen).toHaveBeenCalledWith('t1', expect.any(Function), { lastEventId: 7 });
	});

	it('still listens (without a cursor) when the snapshot fetch fails', async () => {
		const { client } = makeClient();
		client.get.mockRejectedValueOnce(new Error('offline'));
		const watcher = createThreadPromptWatcher(client);

		watcher.watchThread('t1');
		await settle();

		expect(client.listen).toHaveBeenCalledWith('t1', expect.any(Function), {
			lastEventId: undefined,
		});
	});

	it('adds prompts on confirmation-request and clears them on tool-result/tool-error', async () => {
		const { client, emit } = makeClient();
		const watcher = createThreadPromptWatcher(client);
		watcher.watchThread('t1');
		await settle();

		emit('t1', confirmationRequestEvent('req-1'));
		emit('t1', confirmationRequestEvent('req-2'));
		expect(promptIds()).toEqual(['instance:req-1', 'instance:req-2']);

		emit('t1', {
			type: 'tool-result',
			runId: 'run-1',
			agentId: 'a1',
			payload: { toolCallId: 'tool-req-1', result: null },
		} as InstanceAiEvent);
		expect(promptIds()).toEqual(['instance:req-2']);

		emit('t1', {
			type: 'tool-error',
			runId: 'run-1',
			agentId: 'a1',
			payload: { toolCallId: 'tool-req-2', error: 'failed' },
		} as InstanceAiEvent);
		expect(promptIds()).toEqual([]);
	});

	it('clears the run’s prompts on run-finish but spares other runs (replays)', async () => {
		const { client, emit } = makeClient();
		const watcher = createThreadPromptWatcher(client);
		watcher.watchThread('t1');
		await settle();

		emit('t1', confirmationRequestEvent('req-old', 'run-1'));
		emit('t1', confirmationRequestEvent('req-new', 'run-2'));

		// Replayed finish of the older run must not clear the newer run's prompt.
		emit('t1', {
			type: 'run-finish',
			runId: 'run-1',
			agentId: 'a1',
			payload: {},
		} as InstanceAiEvent);
		expect(promptIds()).toEqual(['instance:req-new']);

		emit('t1', {
			type: 'run-finish',
			runId: 'run-2',
			agentId: 'a1',
			payload: {},
		} as InstanceAiEvent);
		expect(promptIds()).toEqual([]);
	});

	it('refcounts watches — the last release unlistens and drops the thread prompts', async () => {
		const { client, emit } = makeClient();
		const watcher = createThreadPromptWatcher(client);

		const releaseFirst = watcher.watchThread('t1');
		const releaseSecond = watcher.watchThread('t1');
		await settle();
		expect(client.get).toHaveBeenCalledTimes(1);

		emit('t1', confirmationRequestEvent('req-1'));
		releaseFirst();
		releaseFirst(); // double release is a no-op
		expect(client.unlisten).not.toHaveBeenCalled();
		expect(promptIds()).toEqual(['instance:req-1']);

		releaseSecond();
		expect(client.unlisten).toHaveBeenCalledTimes(1);
		expect(promptIds()).toEqual([]);
	});

	it('does not listen when the watch is released while the snapshot loads', async () => {
		let resolveGet!: (snapshot: InstanceAiRichMessagesResponse) => void;
		const { client } = makeClient();
		client.get.mockImplementationOnce(
			async () =>
				await new Promise<InstanceAiRichMessagesResponse>((resolve) => {
					resolveGet = resolve;
				}),
		);
		const watcher = createThreadPromptWatcher(client);

		const release = watcher.watchThread('t1');
		release();
		resolveGet(makeSnapshot({ messages: [makePendingMessage('req-1')] }));
		await settle();

		expect(client.listen).not.toHaveBeenCalled();
		expect(promptIds()).toEqual([]);
	});

	it('auto-releases a task watch when its run finishes', async () => {
		const { client, emit } = makeClient();
		const watcher = createThreadPromptWatcher(client);

		watcher.trackTaskThread('t1', 'run-1');
		watcher.trackTaskThread('t1', 'run-1'); // idempotent per run
		await settle();
		expect(client.get).toHaveBeenCalledTimes(1);

		emit('t1', confirmationRequestEvent('req-1'));
		emit('t1', {
			type: 'run-finish',
			runId: 'run-1',
			agentId: 'a1',
			payload: {},
		} as InstanceAiEvent);

		expect(client.unlisten).toHaveBeenCalledTimes(1);
		expect(promptIds()).toEqual([]);
	});

	it('a task watch and a chat watch share the thread; the chat release keeps it alive', async () => {
		const { client, emit } = makeClient();
		const watcher = createThreadPromptWatcher(client);

		watcher.trackTaskThread('t1', 'run-1');
		const releaseChat = watcher.watchThread('t1');
		await settle();

		emit('t1', confirmationRequestEvent('req-1'));
		releaseChat();

		// The task watch still holds the thread — prompt and listener survive.
		expect(client.unlisten).not.toHaveBeenCalled();
		expect(promptIds()).toEqual(['instance:req-1']);
	});

	it('stopAllWatches unlistens everything and drops all instance prompts', async () => {
		const { client, emit } = makeClient();
		const watcher = createThreadPromptWatcher(client);

		watcher.watchThread('t1');
		watcher.trackTaskThread('t2', 'run-2');
		await settle();
		emit('t1', confirmationRequestEvent('req-1'));

		watcher.stopAllWatches();

		expect(client.unlisten).toHaveBeenCalledTimes(2);
		expect(promptIds()).toEqual([]);
	});
});
