import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { InstanceAiMessage, InstanceAiStreamFrame } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

import { ensureThread, postMessage } from '../instanceAi.api';
import { fetchThreadMessages } from '../instanceAi.memory.api';
import { useInstanceAiStore } from '../instanceAi.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restApiContext: { baseUrl: 'http://localhost:5678/api' },
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showError: vi.fn(),
	}),
}));

const mockTelemetryTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({
		track: (...args: unknown[]) => mockTelemetryTrack(...args),
	}),
}));

vi.mock('@n8n/rest-api-client', () => ({
	ResponseError: class ResponseError extends Error {
		httpStatusCode?: number;
	},
}));

vi.mock('../instanceAi.api', () => ({
	ensureThread: vi.fn().mockResolvedValue({
		thread: {
			id: 'thread-1',
			title: '',
			resourceId: 'user-1',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		},
		created: true,
	}),
	postMessage: vi.fn(),
	postCancel: vi.fn(),
	postCancelTask: vi.fn(),
	postConfirmation: vi.fn(),
}));

vi.mock('../instanceAi.memory.api', () => ({
	fetchThreads: vi.fn().mockResolvedValue({ threads: [], total: 0, page: 1, hasMore: false }),
	fetchThreadMessages: vi
		.fn()
		.mockResolvedValue({ threadId: 'thread-1', messages: [], nextEventId: 0 }),
	fetchThreadStatus: vi
		.fn()
		.mockResolvedValue({ hasActiveRun: false, isSuspended: false, backgroundTasks: [] }),
	deleteThread: vi.fn().mockResolvedValue(undefined),
	renameThread: vi.fn().mockResolvedValue({ thread: {} }),
}));

const encoder = new TextEncoder();

class MockThreadStream {
	private controller: ReadableStreamDefaultController<Uint8Array> | null = null;

	private closed = false;

	readonly url: string;

	readonly body: ReadableStream<Uint8Array>;

	constructor(
		url: string,
		private readonly threadId: string,
		autoSync = true,
	) {
		this.url = url;
		this.body = new ReadableStream<Uint8Array>({
			start: (controller) => {
				this.controller = controller;
				if (autoSync) {
					this.pushFrame({
						type: 'sync',
						threadId: this.threadId,
						messages: [],
						taskRuns: [],
						activeRunId: null,
					});
				}
			},
		});
	}

	pushFrame(frame: InstanceAiStreamFrame | Record<string, unknown>): void {
		if (this.closed) return;
		this.controller?.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));
	}

	pushRaw(line: string): void {
		if (this.closed) return;
		this.controller?.enqueue(encoder.encode(`${line}\n`));
	}

	close(): void {
		if (this.closed) return;
		this.closed = true;
		this.controller?.close();
	}

	error(error: unknown): void {
		if (this.closed) return;
		this.closed = true;
		try {
			this.controller?.error(error);
		} catch {
			// ignore double-close races in tests
		}
	}
}

let capturedStream: MockThreadStream | null = null;
let streamInstances: MockThreadStream[] = [];
let nextStreamAutoSync = true;

const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
	const url = String(input);
	const threadId = url.split('/').pop() ?? 'thread-unknown';
	const stream = new MockThreadStream(url, threadId, nextStreamAutoSync);
	nextStreamAutoSync = true;
	capturedStream = stream;
	streamInstances.push(stream);

	if (init?.signal) {
		const signal = init.signal as AbortSignal;
		signal.addEventListener(
			'abort',
			() => {
				stream.error(new DOMException('Aborted', 'AbortError'));
			},
			{ once: true },
		);
	}

	return new Response(stream.body, {
		status: 200,
		headers: { 'Content-Type': 'application/x-ndjson; charset=UTF-8' },
	});
});

vi.stubGlobal('fetch', fetchMock);

function currentStream(): MockThreadStream {
	expect(capturedStream).not.toBeNull();
	return capturedStream as MockThreadStream;
}

function validRunStartEvent(runId: string, agentId: string) {
	return {
		type: 'run-start' as const,
		runId,
		agentId,
		payload: { messageId: `msg-${runId}` },
	};
}

function makeAssistantMessage(
	id: string,
	runId: string,
	overrides: Partial<InstanceAiMessage> = {},
): InstanceAiMessage {
	return {
		id,
		runId,
		messageGroupId: runId,
		role: 'assistant',
		createdAt: '2026-03-18T10:00:00.000Z',
		content: '',
		reasoning: '',
		isStreaming: false,
		agentTree: {
			agentId: `${runId}-root`,
			role: 'orchestrator',
			status: 'completed',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [],
			timeline: [],
		},
		...overrides,
	};
}

const mockFetchThreadMessages = vi.mocked(fetchThreadMessages);
const mockEnsureThread = vi.mocked(ensureThread);
const mockPostMessage = vi.mocked(postMessage);

describe('useInstanceAiStore stream flow', () => {
	let store: ReturnType<typeof useInstanceAiStore>;

	beforeEach(async () => {
		setActivePinia(createPinia());
		capturedStream = null;
		streamInstances = [];
		nextStreamAutoSync = true;
		store = useInstanceAiStore();
		store.newThread();
		await vi.waitFor(() => {
			expect(store.streamState).toBe('connected');
		});
	});

	afterEach(() => {
		store.closeStream();
		for (const stream of streamInstances) {
			stream.close();
		}
		vi.clearAllMocks();
		mockFetchThreadMessages.mockResolvedValue({
			threadId: 'thread-1',
			messages: [],
		});
	});

	test('ignores malformed stream frames', async () => {
		currentStream().pushRaw(JSON.stringify({ invalid: 'shape' }));

		await vi.waitFor(() => {
			expect(store.messages).toHaveLength(0);
			expect(store.activeRunId).toBeNull();
		});
	});

	test('applies valid delta frames after the initial sync', async () => {
		currentStream().pushFrame(validRunStartEvent('run-1', 'agent-root'));

		await vi.waitFor(() => {
			expect(store.messages).toHaveLength(1);
			expect(store.messages[0].runId).toBe('run-1');
			expect(store.activeRunId).toBe('run-1');
		});
	});

	test('sync hydrates active and background groups without overwriting activeRunId', async () => {
		currentStream().pushFrame({
			type: 'sync',
			threadId: store.currentThreadId,
			activeRunId: 'run-active',
			taskRuns: [],
			messages: [
				makeAssistantMessage('assistant-old', 'run-old', {
					messageGroupId: 'mg-old',
					runIds: ['run-old'],
					agentTree: {
						agentId: 'agent-root-old',
						role: 'orchestrator',
						status: 'completed',
						textContent: 'old',
						reasoning: '',
						toolCalls: [],
						children: [
							{
								agentId: 'bg-task',
								role: 'workflow-builder',
								status: 'active',
								textContent: '',
								reasoning: '',
								toolCalls: [],
								children: [],
								timeline: [],
							},
						],
						timeline: [],
					},
				}),
				makeAssistantMessage('assistant-active', 'run-active', {
					messageGroupId: 'mg-active',
					runIds: ['run-active'],
					isStreaming: true,
					agentTree: {
						agentId: 'agent-root-active',
						role: 'orchestrator',
						status: 'active',
						textContent: '',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					},
				}),
			],
		});

		await vi.waitFor(() => {
			expect(store.activeRunId).toBe('run-active');
			const oldMessage = store.messages.find((message) => message.messageGroupId === 'mg-old');
			expect(oldMessage?.isStreaming).toBe(false);
			expect(oldMessage?.agentTree?.children).toHaveLength(1);
		});
	});

	test('ignores deltas until the first sync frame arrives', async () => {
		store.closeStream();
		nextStreamAutoSync = false;
		store.connectStream(store.currentThreadId);

		const stream = currentStream();
		stream.pushFrame(validRunStartEvent('run-pre-sync', 'agent-root'));

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(store.messages).toHaveLength(0);
		expect(store.streamState).toBe('connecting');

		stream.pushFrame({
			type: 'sync',
			threadId: store.currentThreadId,
			messages: [],
			taskRuns: [],
			activeRunId: null,
		});

		await vi.waitFor(() => {
			expect(store.streamState).toBe('connected');
		});

		stream.pushFrame(validRunStartEvent('run-after-sync', 'agent-root'));
		await vi.waitFor(() => {
			expect(store.messages).toHaveLength(1);
			expect(store.messages[0].runId).toBe('run-after-sync');
		});
	});

	test('confirmation-resolved updates synced tool-call confirmation state', async () => {
		currentStream().pushFrame({
			type: 'sync',
			threadId: store.currentThreadId,
			activeRunId: 'run-suspended',
			taskRuns: [],
			messages: [
				makeAssistantMessage('assistant-suspended', 'run-suspended', {
					messageGroupId: 'mg-suspended',
					runIds: ['run-suspended'],
					isStreaming: true,
					agentTree: {
						agentId: 'agent-root',
						role: 'orchestrator',
						status: 'active',
						textContent: '',
						reasoning: '',
						toolCalls: [
							{
								toolCallId: 'tool-plan-approval',
								toolName: 'request-plan-approval',
								args: {},
								isLoading: true,
								renderHint: 'plan',
								confirmation: {
									requestId: 'req-plan',
									severity: 'info',
									message: 'Review the plan before building.',
									inputType: 'approval',
								},
								confirmationStatus: 'pending',
							},
						],
						children: [],
						timeline: [{ type: 'tool-call', toolCallId: 'tool-plan-approval' }],
					},
				}),
			],
		});

		await vi.waitFor(() => {
			expect(store.messages[0].agentTree?.toolCalls[0]?.confirmationStatus).toBe('pending');
		});

		currentStream().pushFrame({
			type: 'confirmation-resolved',
			runId: 'run-suspended',
			agentId: 'agent-root',
			payload: {
				requestId: 'req-plan',
				toolCallId: 'tool-plan-approval',
				status: 'approved',
			},
		});

		await vi.waitFor(() => {
			expect(store.messages[0].agentTree?.toolCalls[0]?.confirmationStatus).toBe('approved');
		});
	});

	test('copyFullTrace includes taskRuns for detached-task debugging', async () => {
		currentStream().pushFrame({
			type: 'sync',
			threadId: store.currentThreadId,
			activeRunId: null,
			messages: [],
			taskRuns: [
				{
					taskId: 'task-1',
					threadId: store.currentThreadId,
					originRunId: 'run-1',
					messageGroupId: 'mg-1',
					agentId: 'agent-builder',
					role: 'workflow-builder',
					kind: 'workflow-build',
					title: 'Building workflow',
					status: 'running',
					createdAt: 1,
					startedAt: 1,
					updatedAt: 2,
				},
			],
		});

		await vi.waitFor(() => {
			expect(store.currentTaskRuns).toHaveLength(1);
		});

		const trace = jsonParse<{
			taskRuns: Array<{ taskId: string; status: string }>;
		}>(store.copyFullTrace());

		expect(trace.taskRuns).toEqual([
			expect.objectContaining({
				taskId: 'task-1',
				status: 'running',
			}),
		]);
	});

	test('currentPlan selects the latest assistant plan in the thread', () => {
		store.messages.push(
			{
				id: 'user-1',
				role: 'user',
				createdAt: '2026-03-18T10:00:00.000Z',
				content: 'Build something',
				reasoning: '',
				isStreaming: false,
			},
			makeAssistantMessage('assistant-plan-1', 'run-plan-1', {
				agentTree: {
					agentId: 'agent-root-1',
					role: 'orchestrator',
					status: 'completed',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [],
					plan: {
						planId: 'plan-1',
						goal: 'First plan',
						summary: 'First summary',
						assumptions: [],
						externalSystems: [],
						dataContracts: [],
						acceptanceCriteria: [],
						openQuestions: [],
						status: 'completed',
						lastUpdatedAt: '2026-03-18T10:00:01.000Z',
						phases: [],
					},
				},
			}),
			makeAssistantMessage('assistant-no-plan', 'run-no-plan', {
				content: 'Working',
				agentTree: {
					agentId: 'agent-root-2',
					role: 'orchestrator',
					status: 'completed',
					textContent: 'Working',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [],
				},
			}),
			makeAssistantMessage('assistant-plan-2', 'run-plan-2', {
				agentTree: {
					agentId: 'agent-root-3',
					role: 'orchestrator',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [],
					plan: {
						planId: 'plan-2',
						goal: 'Latest plan',
						summary: 'Latest summary',
						assumptions: [],
						externalSystems: [],
						dataContracts: [],
						acceptanceCriteria: [],
						openQuestions: [],
						status: 'running',
						lastUpdatedAt: '2026-03-18T10:00:03.000Z',
						phases: [],
					},
				},
			}),
		);

		expect(store.currentPlanMessage?.id).toBe('assistant-plan-2');
		expect(store.currentPlanAgentNode?.agentId).toBe('agent-root-3');
		expect(store.currentPlan?.planId).toBe('plan-2');
	});

	test('deleting the last active thread clears stale routing state before the replacement stream starts', async () => {
		const deletedThreadId = store.currentThreadId;
		const previousStream = currentStream();

		previousStream.pushFrame({
			type: 'run-start',
			runId: 'run-old',
			agentId: 'old-root',
			payload: { messageId: 'msg-1', messageGroupId: 'mg-old' },
		});

		await vi.waitFor(() => {
			expect(store.messages).toHaveLength(1);
		});

		await store.deleteThread(deletedThreadId);

		await vi.waitFor(() => {
			expect(capturedStream).not.toBe(previousStream);
			expect(store.currentThreadId).not.toBe(deletedThreadId);
			expect(store.streamState).toBe('connected');
		});

		currentStream().pushFrame({
			type: 'text-delta',
			runId: 'run-old',
			agentId: 'fresh-root',
			payload: { text: 'hello again' },
		});

		await vi.waitFor(() => {
			expect(store.messages).toHaveLength(1);
			expect(store.messages[0].messageGroupId).toBe('run-old');
			expect(store.messages[0].agentTree?.agentId).toBe('fresh-root');
		});
	});

	test('loadHistoricalMessages skips unsafe routing identifiers when rebuilding state', async () => {
		mockFetchThreadMessages.mockResolvedValueOnce({
			threadId: store.currentThreadId,
			messages: [
				{
					id: 'msg-unsafe',
					runId: 'safe-run',
					messageGroupId: '__proto__',
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: '',
					reasoning: '',
					isStreaming: false,
					agentTree: {
						agentId: 'agent-root',
						role: 'orchestrator',
						status: 'completed',
						textContent: '',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					},
				},
			],
		});

		await store.loadHistoricalMessages(store.currentThreadId);

		currentStream().pushFrame({
			type: 'text-delta',
			runId: 'safe-run',
			agentId: 'fresh-root',
			payload: { text: 'restored safely' },
		});

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(store.messages).toHaveLength(1);
		expect(store.messages[0].messageGroupId).toBe('__proto__');
		expect(store.messages[0].agentTree?.agentId).toBe('agent-root');
		expect(store.messages[0].content).toBe('');
	});

	test('sendMessage syncs a new thread before the first post and reuses the persisted thread afterwards', async () => {
		mockEnsureThread.mockResolvedValueOnce({
			thread: {
				id: store.currentThreadId,
				title: '',
				resourceId: 'user-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
			created: true,
		});
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		await store.sendMessage('first');
		await store.sendMessage('second');

		expect(mockEnsureThread).toHaveBeenCalledTimes(1);
		expect(mockEnsureThread).toHaveBeenCalledWith(
			expect.objectContaining({ baseUrl: 'http://localhost:5678/api' }),
			store.currentThreadId,
		);
		expect(mockPostMessage).toHaveBeenCalledTimes(2);
	});
});

// ---------------------------------------------------------------------------
// Store-level feedback integration tests
// (Composable logic is tested in useResponseFeedback.test.ts)
// ---------------------------------------------------------------------------

describe('useInstanceAiStore - feedback integration', () => {
	let store: ReturnType<typeof useInstanceAiStore>;

	beforeEach(async () => {
		setActivePinia(createPinia());
		capturedOnMessage = null;
		store = useInstanceAiStore();
		store.newThread();
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
	});

	afterEach(() => {
		store.closeSSE();
		vi.clearAllMocks();
	});

	test('store exposes rateableResponseId, feedbackByResponseId, and submitFeedback', () => {
		expect(store.rateableResponseId).toBeNull();
		expect(store.feedbackByResponseId).toEqual({});
		expect(typeof store.submitFeedback).toBe('function');
	});

	test('feedbackByResponseId is cleared when creating a new thread', async () => {
		store.submitFeedback('resp-1', { rating: 'up' });
		expect(store.feedbackByResponseId['resp-1']).toBeDefined();

		store.newThread();
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});

		expect(Object.keys(store.feedbackByResponseId)).toHaveLength(0);
	});
});
