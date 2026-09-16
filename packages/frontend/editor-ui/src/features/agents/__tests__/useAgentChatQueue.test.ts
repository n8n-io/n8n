import { effectScope, nextTick, reactive, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import {
	APPROVAL_TOOL_NAME,
	type AgentChatAdmissionResponse,
	type AgentChatQueueItem,
	type PushMessage,
	type PushPayload,
} from '@n8n/api-types';

const api = vi.hoisted(() => ({
	sendAgentChatMessage: vi.fn(),
	resumeAgentChat: vi.fn(),
	getAgentChatQueue: vi.fn(),
	getChatMessages: vi.fn(),
	getTestChatMessages: vi.fn(),
	editAgentChatQueueMessage: vi.fn(),
	removeAgentChatQueueMessage: vi.fn(),
	sendAgentChatQueueMessageNow: vi.fn(),
	requeueAgentChatQueueMessage: vi.fn(),
	stopAgentChatQueueEntry: vi.fn(),
	cancelAgentChatRun: vi.fn(),
}));
const listeners = new Set<(event: PushMessage) => void>();
const connection = reactive({ isConnected: true });
vi.mock('../composables/useAgentApi', () => api);
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
vi.mock('@n8n/i18n', () => ({ useI18n: () => ({ baseText: (key: string) => key }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));
vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		get isConnected() {
			return connection.isConnected;
		},
		pushConnect: vi.fn(),
		addEventListener: (listener: (event: PushMessage) => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	}),
}));

import { useAgentChatStream } from '../composables/useAgentChatStream';

const scope = () => effectScope();
let currentScope: ReturnType<typeof scope>;
let hook: ReturnType<typeof useAgentChatStream>;
let items: AgentChatQueueItem[];

function emit(
	clientRequestId: string,
	queueId: string,
	event: PushPayload<'agentChatEvent'>['event'],
	threadId = 'thread-1',
) {
	for (const listener of listeners)
		listener({
			type: 'agentChatEvent',
			data: { projectId: 'p1', agentId: 'a1', threadId, clientRequestId, queueId, event },
		});
}

function message(
	id: string,
	text: string,
	status: AgentChatQueueItem['status'] = 'queued',
): AgentChatQueueItem {
	return { id, kind: 'message', message: text, attachments: [], status };
}

beforeEach(() => {
	vi.resetAllMocks();
	connection.isConnected = true;
	items = [];
	api.getAgentChatQueue.mockImplementation(async () => ({ items: [...items] }));
	api.getChatMessages.mockResolvedValue({ messages: [], openSuspensions: [] });
	api.sendAgentChatMessage.mockImplementation(async (_context, _project, _agent, payload) => {
		const item = message(String(items.length + 1), payload.message);
		items.push(item);
		return { status: 'queued', sessionId: 'thread-1', item };
	});
	currentScope = scope();
	hook = currentScope.run(() =>
		useAgentChatStream({
			projectId: ref('p1'),
			agentId: ref('a1'),
			continueSessionId: ref('thread-1'),
		}),
	)!;
});

afterEach(() => currentScope.stop());

it('reports a queued conversation as present before its first execution is recorded', async () => {
	currentScope.stop();
	const onHistoryLoaded = vi.fn();
	currentScope = scope();
	items = [message('1', 'waiting')];
	api.getChatMessages.mockRejectedValue({ httpStatusCode: 404 });
	hook = currentScope.run(() =>
		useAgentChatStream({
			projectId: ref('p1'),
			agentId: ref('a1'),
			continueSessionId: ref('thread-1'),
			onHistoryLoaded,
		}),
	)!;
	await hook.loadHistory();
	expect(hook.queuedMessages.value).toEqual(items);
	expect(onHistoryLoaded).toHaveBeenCalledWith(0, true, true);
});

it('sends the server-provided active target with the selected queued message', async () => {
	items = [message('2', 'correction')];
	const target = { mode: 'active', executionId: crypto.randomUUID(), runId: 'run-1' } as const;
	api.getAgentChatQueue.mockResolvedValue({ items, sendNowTarget: target });
	api.sendAgentChatQueueMessageNow.mockResolvedValue(message('2', 'correction', 'steering'));
	hook.refresh();
	await flushPromises();

	await hook.sendQueuedMessageNow('2');

	expect(api.sendAgentChatQueueMessageNow).toHaveBeenCalledWith(
		{},
		'p1',
		'a1',
		'thread-1',
		'2',
		target,
	);
	expect(hook.queuedMessages.value[0]?.status).toBe('steering');
});

it('admits more messages while a run is active and shows saved text only when it starts', async () => {
	expect(await hook.sendMessage('first')).toBe(true);
	expect(hook.messages.value).toEqual([]);
	const firstRequest = api.sendAgentChatMessage.mock.calls[0][3].clientRequestId;
	items[0] = message('1', 'saved edit', 'processing');
	emit(firstRequest, '1', { type: 'processing', item: items[0] });
	emit(firstRequest, '1', { type: 'text-delta', id: 'text', delta: 'Working' });
	expect(await hook.sendMessage('second')).toBe(true);
	expect(hook.messages.value.map(({ content }) => content)).toEqual(['saved edit', 'Working']);
	expect(hook.queuedMessages.value.map(({ message: text }) => text)).toEqual(['second']);
	expect(hook.isStreaming.value).toBe(true);
});

it('ignores an acknowledgement that arrives after completion and filters unknown requests', async () => {
	api.getChatMessages.mockRejectedValue({ httpStatusCode: 404 });
	api.sendAgentChatMessage.mockImplementationOnce(async (_context, _project, _agent, payload) => {
		const item = message('1', 'saved', 'processing');
		emit('another-view', '1', { type: 'processing', item });
		emit(payload.clientRequestId, '1', { type: 'processing', item }, 'other-thread');
		emit(payload.clientRequestId, '1', { type: 'processing', item });
		emit(payload.clientRequestId, '1', { type: 'text-delta', id: 'text', delta: 'Done' });
		emit(payload.clientRequestId, '1', { type: 'done', executionId: 'execution-1' });
		return { status: 'queued', sessionId: 'thread-1', item: { ...item, status: 'queued' } };
	});
	expect(await hook.sendMessage('original')).toBe(true);
	expect(hook.queuedMessages.value).toEqual([]);
	expect(hook.messages.value.map(({ content }) => content)).toEqual(['saved', 'Done']);
	expect(hook.messages.value.every(({ executionId }) => executionId === 'execution-1')).toBe(true);
});

it('keeps displayed text on disconnect and stops listening on disposal without cancelling work', async () => {
	await hook.sendMessage('first');
	const requestId = api.sendAgentChatMessage.mock.calls[0][3].clientRequestId;
	items[0] = message('1', 'first', 'processing');
	emit(requestId, '1', { type: 'processing', item: items[0] });
	emit(requestId, '1', { type: 'text-delta', id: 'text', delta: 'Partial' });
	connection.isConnected = false;
	await nextTick();
	expect(hook.messages.value.map(({ content }) => content)).toEqual(['first', 'Partial']);
	connection.isConnected = true;
	await flushPromises();
	emit(requestId, '1', { type: 'text-delta', id: 'text', delta: ' ignored after reconnect' });
	expect(hook.messages.value[1].content).toBe('Partial');
	items = [];
	api.getChatMessages.mockResolvedValue({
		messages: [
			{ id: 'saved', role: 'assistant', content: [{ type: 'text', text: 'Saved result' }] },
		],
		openSuspensions: [],
	});
	for (const listener of listeners)
		listener({
			type: 'agentExecutionUpdated',
			data: { projectId: 'p1', agentId: 'a1', threadId: 'thread-1', executionId: 'execution-1' },
		});
	await flushPromises();
	expect(hook.messages.value.map(({ content }) => content)).toEqual(['Saved result']);
	currentScope.stop();
	emit(requestId, '1', { type: 'text-delta', id: 'text', delta: ' ignored' });
	expect(hook.messages.value[0].content).toBe('Saved result');
	expect(api.stopAgentChatQueueEntry).not.toHaveBeenCalled();
	expect(api.cancelAgentChatRun).not.toHaveBeenCalled();
	expect(listeners.size).toBe(0);
});

it('refreshes queue state during live rendering and stops only the selected entry', async () => {
	await hook.sendMessage('first');
	const requestId = api.sendAgentChatMessage.mock.calls[0][3].clientRequestId;
	items[0] = message('1', 'first', 'processing');
	emit(requestId, '1', { type: 'processing', item: items[0] });
	emit(requestId, '1', { type: 'text-delta', id: 'text', delta: 'Partial' });
	items.push(message('2', 'second'));
	hook.refresh();
	await flushPromises();
	expect(hook.queuedMessages.value.map(({ id }) => id)).toEqual(['2']);
	expect(hook.messages.value[1].content).toBe('Partial');
	api.stopAgentChatQueueEntry.mockImplementationOnce(async () => {
		items[0].status = 'cancelling';
		return { cancelled: true };
	});
	await hook.stopGenerating();
	expect(api.stopAgentChatQueueEntry).toHaveBeenCalledWith({}, 'p1', 'a1', 'thread-1', '1');
	expect(hook.isCancelling.value).toBe(true);
	expect(hook.queuedMessages.value.map(({ id }) => id)).toEqual(['2']);
});

it('keeps the next request active when the previous request completes', async () => {
	await hook.sendMessage('first');
	await hook.sendMessage('second');
	const first = api.sendAgentChatMessage.mock.calls[0][3].clientRequestId;
	const second = api.sendAgentChatMessage.mock.calls[1][3].clientRequestId;
	emit(first, '1', { type: 'processing', item: message('1', 'first', 'processing') });
	emit(first, '1', { type: 'text-delta', id: 'one', delta: 'First response' });
	emit(second, '2', { type: 'processing', item: message('2', 'second', 'processing') });
	emit(second, '2', { type: 'text-delta', id: 'two', delta: 'Second response' });
	items = [message('2', 'second', 'processing')];
	emit(first, '1', { type: 'done', executionId: 'execution-1' });
	await flushPromises();
	expect(hook.isStreaming.value).toBe(true);
	expect(hook.messages.value.at(-1)).toMatchObject({
		content: 'Second response',
		status: 'streaming',
	});
	expect(hook.messages.value[1]).toMatchObject({
		content: 'First response',
		status: 'success',
		executionId: 'execution-1',
	});
});

it('reconciles a finished run when its terminal push was missed', async () => {
	await hook.sendMessage('first');
	const requestId = api.sendAgentChatMessage.mock.calls[0][3].clientRequestId;
	items = [message('1', 'first', 'processing')];
	emit(requestId, '1', { type: 'processing', item: items[0] });
	emit(requestId, '1', { type: 'text-delta', id: 'text', delta: 'Partial' });
	items = [];
	api.getChatMessages.mockResolvedValue({
		messages: [
			{ id: 'saved', role: 'assistant', content: [{ type: 'text', text: 'Saved result' }] },
		],
		openSuspensions: [],
	});
	hook.refresh();
	await flushPromises();
	expect(hook.isStreaming.value).toBe(false);
	expect(hook.messages.value.map(({ content }) => content)).toEqual(['Saved result']);
});

it('restores an accepted HITL response and keeps the card disabled until it is processed', async () => {
	const approval = { type: 'approval', toolName: 'calculator', args: {} };
	api.getChatMessages.mockResolvedValue({
		messages: [
			{
				id: 'saved',
				role: 'assistant',
				content: [{ type: 'tool-call', toolCallId: 'tool-1', toolName: 'calculator', input: {} }],
			},
		],
		openSuspensions: [{ runId: 'run-1', toolCallId: 'tool-1', suspendPayload: approval }],
	});
	items = [
		{ id: '1', status: 'queued', kind: 'hitl', runId: 'run-1', toolCallId: 'tool-1' },
		message('2', 'ordinary'),
	];
	await hook.loadHistory();
	expect(hook.messages.value[0].interactive).toMatchObject({
		toolName: APPROVAL_TOOL_NAME,
		pendingResponse: true,
	});
	expect(hook.queuedMessages.value.map(({ id }) => id)).toEqual(['2']);
	await hook.resume({ runId: 'run-1', toolCallId: 'tool-1', resumeData: { approved: true } });
	expect(api.resumeAgentChat).not.toHaveBeenCalled();
});

it('retains the open card when HITL admission fails', async () => {
	api.getChatMessages.mockRejectedValue({ httpStatusCode: 404 });
	hook.messages.value = [
		{
			id: 'card',
			role: 'assistant',
			content: '',
			status: 'awaitingUser',
			toolCalls: [{ tool: 'calculator', toolCallId: 'tool-1', runId: 'run-1', state: 'suspended' }],
			interactive: {
				toolCallId: 'tool-1',
				runId: 'run-1',
				toolName: APPROVAL_TOOL_NAME,
				input: { type: 'approval', toolName: 'calculator', args: {} },
			},
		},
	];
	api.resumeAgentChat.mockRejectedValue(new Error('Admission failed'));
	await hook.resume({ runId: 'run-1', toolCallId: 'tool-1', resumeData: { approved: true } });
	expect(hook.messages.value[0].interactive?.resolvedAt).toBeUndefined();
	expect(hook.messages.value[0].interactive?.pendingResponse).toBeFalsy();
	expect(hook.messages.value[0].toolCalls?.[0].state).toBe('suspended');
});

it('can stop an admitted response before it starts without removing ordinary messages', async () => {
	const item: AgentChatQueueItem = {
		id: '1',
		kind: 'hitl',
		status: 'queued',
		runId: 'run-1',
		toolCallId: 'tool-1',
	};
	items = [item, message('2', 'next')];
	api.resumeAgentChat.mockResolvedValue({ status: 'queued', sessionId: 'thread-1', item });
	await hook.resume({ runId: 'run-1', toolCallId: 'tool-1', resumeData: { approved: true } });
	api.cancelAgentChatRun.mockImplementation(async () => {
		items = [message('2', 'next')];
		return { cancelled: true };
	});
	await hook.stopGenerating();
	expect(api.cancelAgentChatRun).toHaveBeenCalledWith({}, 'p1', 'a1', 'run-1');
	expect(hook.queuedMessages.value.map(({ id }) => id)).toEqual(['2']);
});

it('keeps an in-flight response pending and preserves a new suspension before admission returns', async () => {
	api.getChatMessages.mockRejectedValue({ httpStatusCode: 404 });
	await hook.sendMessage('first');
	const firstRequest = api.sendAgentChatMessage.mock.calls[0][3].clientRequestId;
	emit(firstRequest, '1', { type: 'processing', item: message('1', 'first', 'processing') });
	const approval = { type: 'approval', toolName: 'calculator', args: { value: 1 } };
	emit(firstRequest, '1', {
		type: 'tool-call-suspended',
		payload: { runId: 'run-1', toolCallId: 'tool-1', toolName: 'calculator', input: approval },
	});
	items = [];
	emit(firstRequest, '1', { type: 'done' });
	const admission = createDeferredPromise<AgentChatAdmissionResponse>();
	api.resumeAgentChat.mockReturnValue(admission.promise);
	const resuming = hook.resume({
		runId: 'run-1',
		toolCallId: 'tool-1',
		resumeData: { approved: true },
	});
	hook.refresh();
	await flushPromises();
	expect(hook.messages.value[1].interactive?.pendingResponse).toBe(true);
	const requestId = api.resumeAgentChat.mock.calls[0][3].clientRequestId;
	const item: AgentChatQueueItem = {
		id: '2',
		kind: 'hitl',
		status: 'processing',
		runId: 'run-1',
		toolCallId: 'tool-1',
	};
	items = [item];
	emit(requestId, '2', { type: 'processing', item });
	emit(requestId, '2', {
		type: 'tool-call-suspended',
		payload: {
			runId: 'run-1',
			toolCallId: 'tool-1',
			toolName: 'calculator',
			input: { ...approval, args: { value: 2 } },
		},
	});
	items = [];
	emit(requestId, '2', { type: 'done' });
	admission.resolve({
		status: 'queued',
		sessionId: 'thread-1',
		item: { ...item, status: 'queued' },
	});
	await resuming;
	expect(hook.messages.value[1].toolCalls?.[0].state).toBe('suspended');
	expect(hook.messages.value[1].interactive).toMatchObject({ input: { args: { value: 2 } } });
	expect(hook.messages.value[1].interactive?.resolvedAt).toBeUndefined();
	expect(hook.messages.value[1].interactive?.pendingResponse).toBeFalsy();
});

it('settles the cancelled response card while the next request remains active', async () => {
	api.getChatMessages.mockRejectedValue({ httpStatusCode: 404 });
	hook.messages.value = [
		{
			id: 'card',
			role: 'assistant',
			content: '',
			status: 'awaitingUser',
			toolCalls: [{ tool: 'calculator', toolCallId: 'tool-1', runId: 'run-1', state: 'suspended' }],
			interactive: {
				toolCallId: 'tool-1',
				runId: 'run-1',
				toolName: APPROVAL_TOOL_NAME,
				input: { type: 'approval', toolName: 'calculator', args: {} },
			},
		},
	];
	api.resumeAgentChat.mockImplementationOnce(async (_context, _project, _agent, payload) => {
		const item: AgentChatQueueItem = {
			id: '1',
			kind: 'hitl',
			status: 'processing',
			runId: 'run-1',
			toolCallId: 'tool-1',
		};
		items = [item];
		emit(payload.clientRequestId, '1', { type: 'processing', item });
		return { status: 'queued', sessionId: 'thread-1', item };
	});
	await hook.resume({ runId: 'run-1', toolCallId: 'tool-1', resumeData: { approved: true } });
	const responseRequest = api.resumeAgentChat.mock.calls[0][3].clientRequestId;
	await hook.sendMessage('next');
	const nextRequest = api.sendAgentChatMessage.mock.calls[0][3].clientRequestId;
	items = [message('2', 'next', 'processing')];
	emit(nextRequest, '2', { type: 'processing', item: items[0] });
	emit(responseRequest, '1', { type: 'cancelled' });
	expect(hook.messages.value[0].interactive?.cancelled).toBe(true);
	expect(hook.messages.value[0].interactive?.resolvedAt).toBeDefined();
	expect(hook.messages.value[0].status).toBe('success');
	expect(hook.isStreaming.value).toBe(true);
});
