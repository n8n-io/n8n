import type {
	InstanceAiConfirmationRequestEvent,
	InstanceAiEvent,
	InstanceAiThreadStatusResponse,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { StoredEvent } from '@n8n/instance-ai';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { InProcessEventBus } from '@/modules/instance-ai/event-bus/in-process-event-bus';
import type { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';

import { SlackStreamRenderer, type SlackStreamRendererTarget } from '../slack-stream-renderer';
import type { SlackChunk, StreamTransport, SlackWebClient } from '../slack-web-client';

const RUN_ID = 'run-1';
const AGENT_ID = 'agent-1';

function idleStatus(): InstanceAiThreadStatusResponse {
	return { hasActiveRun: false, isSuspended: false, backgroundTasks: [] };
}

function activeStatus(): InstanceAiThreadStatusResponse {
	return { hasActiveRun: true, isSuspended: false, backgroundTasks: [] };
}

function tasksUpdateEvent(
	tasks: Array<{
		id: string;
		description: string;
		status: 'todo' | 'in_progress' | 'done' | 'failed' | 'cancelled';
		detail?: string;
	}>,
): InstanceAiEvent {
	return {
		type: 'tasks-update',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { tasks: { tasks } },
	} as InstanceAiEvent;
}

function toolInputStartEvent(toolCallId: string, toolName: string): InstanceAiEvent {
	return {
		type: 'tool-input-start',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { toolCallId, toolName },
	} as InstanceAiEvent;
}

function toolCallEvent(
	toolCallId: string,
	toolName: string,
	args: Record<string, unknown> = {},
): InstanceAiEvent {
	return {
		type: 'tool-call',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { toolCallId, toolName, args },
	} as InstanceAiEvent;
}

function toolResultEvent(toolCallId: string): InstanceAiEvent {
	return {
		type: 'tool-result',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { toolCallId, result: {} },
	} as InstanceAiEvent;
}

function toolErrorEvent(toolCallId: string, error: string): InstanceAiEvent {
	return {
		type: 'tool-error',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { toolCallId, error },
	} as InstanceAiEvent;
}

function toolInterruptedEvent(toolCallId: string, error: string): InstanceAiEvent {
	return {
		type: 'tool-interrupted',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { toolCallId, error },
	} as InstanceAiEvent;
}

function textDeltaEvent(text: string): InstanceAiEvent {
	return {
		type: 'text-delta',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { text },
	} as InstanceAiEvent;
}

function statusEvent(message: string): InstanceAiEvent {
	return {
		type: 'status',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { message },
	} as InstanceAiEvent;
}

function errorEvent(content: string): InstanceAiEvent {
	return {
		type: 'error',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { content },
	} as InstanceAiEvent;
}

function runFinishEvent(
	status: 'completed' | 'cancelled' | 'error' | 'interrupted',
): InstanceAiEvent {
	return {
		type: 'run-finish',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { status },
	} as InstanceAiEvent;
}

function confirmationRequestEvent(): InstanceAiEvent {
	return {
		type: 'confirmation-request',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { message: 'Should I proceed?' },
	} as InstanceAiEvent;
}

function reasoningDeltaEvent(): InstanceAiEvent {
	return {
		type: 'reasoning-delta',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { text: 'thinking...' },
	} as InstanceAiEvent;
}

function textBlockEvent(): InstanceAiEvent {
	return {
		type: 'text-block',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { text: 'a full block' },
	} as InstanceAiEvent;
}

function reasoningBlockEvent(): InstanceAiEvent {
	return {
		type: 'reasoning-block',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { text: 'a full reasoning block' },
	} as InstanceAiEvent;
}

function threadTitleUpdatedEvent(): InstanceAiEvent {
	return {
		type: 'thread-title-updated',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { title: 'New title' },
	} as InstanceAiEvent;
}

function filesystemRequestEvent(): InstanceAiEvent {
	return {
		type: 'filesystem-request',
		runId: RUN_ID,
		agentId: AGENT_ID,
		payload: { requestId: 'req-1', toolCall: { name: 'read', arguments: {} } },
	} as InstanceAiEvent;
}

function stoppedByUserError(): OperationalError {
	return new OperationalError('Slack API call to "chat.appendStream" failed: stopped_by_user', {
		tags: { slackErrorCode: 'stopped_by_user' },
	});
}

function notInStreamingStateError(): OperationalError {
	return new OperationalError(
		'Slack API call to "chat.appendStream" failed: message_not_in_streaming_state',
		{ tags: { slackErrorCode: 'message_not_in_streaming_state' } },
	);
}

function taskUpdateChunks(chunks: SlackChunk[]): Array<SlackChunk & { type: 'task_update' }> {
	return chunks.filter(
		(chunk): chunk is SlackChunk & { type: 'task_update' } => chunk.type === 'task_update',
	);
}

function markdownChunks(chunks: SlackChunk[]): Array<SlackChunk & { type: 'markdown_text' }> {
	return chunks.filter(
		(chunk): chunk is SlackChunk & { type: 'markdown_text' } => chunk.type === 'markdown_text',
	);
}

function createHarness() {
	const transport = mock<StreamTransport>();
	transport.open.mockResolvedValue(undefined);
	transport.append.mockResolvedValue(undefined);
	transport.close.mockResolvedValue(undefined);

	const webClient = mock<SlackWebClient>();
	webClient.openStream.mockResolvedValue(transport);
	webClient.postMessage.mockResolvedValue({ ts: '123.456' });
	webClient.setStatus.mockResolvedValue(undefined);

	const instanceAiService = mock<InstanceAiService>();
	instanceAiService.getThreadStatus.mockReturnValue(idleStatus());
	instanceAiService.routeCancelRun.mockResolvedValue(undefined);

	let handler: ((stored: StoredEvent) => void) | undefined;
	const unsubscribe = vi.fn();
	const eventBus = mock<InProcessEventBus>();
	eventBus.subscribe.mockImplementation((_threadId, h) => {
		handler = h;
		return unsubscribe;
	});

	const logger = mock<Logger>();

	const renderer = new SlackStreamRenderer(webClient, eventBus, instanceAiService, logger);

	const target: SlackStreamRendererTarget = {
		botToken: 'xoxb-test',
		channelId: 'C123',
		threadTs: '1000.0001',
		recipientUserId: 'U1',
		recipientTeamId: 'T1',
	};

	function emit(event: InstanceAiEvent, id?: number): void {
		if (!handler) throw new Error('renderer never subscribed to the event bus');
		handler({ id, event });
	}

	return {
		transport,
		webClient,
		instanceAiService,
		eventBus,
		logger,
		renderer,
		target,
		emit,
		unsubscribe,
	};
}

describe('SlackStreamRenderer', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe('attach', () => {
		it('opens a native stream transport mapped from the target', async () => {
			const { renderer, webClient, target } = createHarness();

			await renderer.attach('thread-1', target);

			expect(webClient.openStream).toHaveBeenCalledWith(
				target.botToken,
				{
					channel: target.channelId,
					threadTs: target.threadTs,
					recipientUserId: target.recipientUserId,
					recipientTeamId: target.recipientTeamId,
				},
				'native',
			);
		});

		it('subscribes to the thread on the event bus', async () => {
			const { renderer, eventBus, target } = createHarness();

			await renderer.attach('thread-1', target);

			expect(eventBus.subscribe).toHaveBeenCalledTimes(1);
			expect(eventBus.subscribe).toHaveBeenCalledWith('thread-1', expect.any(Function));
		});

		it('is idempotent per threadId', async () => {
			const { renderer, webClient, eventBus, target } = createHarness();

			await renderer.attach('thread-1', target);
			await renderer.attach('thread-1', target);

			expect(webClient.openStream).toHaveBeenCalledTimes(1);
			expect(eventBus.subscribe).toHaveBeenCalledTimes(1);
		});

		it('posts a plain failure message and cleans up when open() rejects', async () => {
			const { renderer, webClient, eventBus, target } = createHarness();
			webClient.openStream.mockRejectedValueOnce(new OperationalError('invalid_auth'));

			await renderer.attach('thread-1', target);

			expect(eventBus.subscribe).not.toHaveBeenCalled();
			expect(webClient.postMessage).toHaveBeenCalledTimes(1);
			const [token, args] = webClient.postMessage.mock.calls[0];
			expect(token).toBe(target.botToken);
			expect(args.channel).toBe(target.channelId);
			expect(args.threadTs).toBe(target.threadTs);
			expect(args.text.length).toBeGreaterThan(0);
		});

		it('allows a retry after a failed open', async () => {
			const { renderer, webClient, eventBus, target } = createHarness();
			webClient.openStream.mockRejectedValueOnce(new OperationalError('invalid_auth'));

			await renderer.attach('thread-1', target);
			await renderer.attach('thread-1', target);

			expect(webClient.openStream).toHaveBeenCalledTimes(2);
			expect(eventBus.subscribe).toHaveBeenCalledTimes(1);
		});
	});

	describe('tasks-update', () => {
		it('emits the plan title once and a task_update per task', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(
				tasksUpdateEvent([
					{ id: 't1', description: 'Read the spec', status: 'todo' },
					{ id: 't2', description: 'Build the workflow', status: 'in_progress' },
				]),
			);

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(1);
			});
			const chunks: SlackChunk[] = transport.append.mock.calls[0][0];
			expect(chunks[0]).toEqual({ type: 'plan_update', title: expect.any(String) });
			const tasks = taskUpdateChunks(chunks);
			expect(tasks).toEqual([
				{
					type: 'task_update',
					id: 't1',
					title: 'Read the spec',
					status: 'pending',
					details: undefined,
				},
				{
					type: 'task_update',
					id: 't2',
					title: 'Build the workflow',
					status: 'in_progress',
					details: undefined,
				},
			]);
		});

		it('maps every task status onto the Slack status', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(
				tasksUpdateEvent([
					{ id: 't1', description: 'a', status: 'todo' },
					{ id: 't2', description: 'b', status: 'in_progress' },
					{ id: 't3', description: 'c', status: 'done' },
					{ id: 't4', description: 'd', status: 'failed' },
					{ id: 't5', description: 'e', status: 'cancelled' },
				]),
			);

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(1);
			});
			const chunks = transport.append.mock.calls[0][0];
			const statuses = taskUpdateChunks(chunks).map((c) => [c.id, c.status]);
			expect(statuses).toEqual([
				['t1', 'pending'],
				['t2', 'in_progress'],
				['t3', 'complete'],
				['t4', 'error'],
				['t5', 'error'],
			]);
		});

		it('only emits diffs on a second tasks-update, and never repeats the plan title', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(
				tasksUpdateEvent([
					{ id: 't1', description: 'Read the spec', status: 'in_progress' },
					{ id: 't2', description: 'Build the workflow', status: 'todo' },
				]),
			);
			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(1);
			});
			transport.append.mockClear();

			emit(
				tasksUpdateEvent([
					{ id: 't1', description: 'Read the spec', status: 'done' },
					{ id: 't2', description: 'Build the workflow', status: 'todo' },
				]),
			);

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(1);
			});
			const chunks = transport.append.mock.calls[0][0];
			expect(chunks).toEqual([
				{
					type: 'task_update',
					id: 't1',
					title: 'Read the spec',
					status: 'complete',
					details: undefined,
				},
			]);
		});

		it('does not emit anything when nothing changed', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(tasksUpdateEvent([{ id: 't1', description: 'a', status: 'in_progress' }]));
			transport.append.mockClear();
			emit(tasksUpdateEvent([{ id: 't1', description: 'a', status: 'in_progress' }]));

			expect(transport.append).not.toHaveBeenCalled();
		});
	});

	describe('tool events without a plan', () => {
		it('renders tool-input-start and tool-call as an in_progress task with a human label', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(toolInputStartEvent('call-1', 'workflows'));
			emit(toolCallEvent('call-1', 'workflows', { action: 'list' }));

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(2);
			});
			expect(transport.append.mock.calls[0][0]).toEqual([
				{ type: 'task_update', id: 'call-1', title: 'Workflows', status: 'in_progress' },
			]);
			expect(transport.append.mock.calls[1][0]).toEqual([
				{ type: 'task_update', id: 'call-1', title: 'Listing workflows', status: 'in_progress' },
			]);
		});

		it('never renders the raw tool name', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(toolCallEvent('call-1', 'update_workflow', {}));

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(1);
			});
			const chunk = taskUpdateChunks(transport.append.mock.calls[0][0])[0];
			expect(chunk.title).toBe('Updating the workflow');
		});

		it('completes the task row on tool-result', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(toolCallEvent('call-1', 'workflows', { action: 'list' }));
			emit(toolResultEvent('call-1'));

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(2);
			});
			expect(transport.append.mock.calls[1][0]).toEqual([
				{ type: 'task_update', id: 'call-1', title: 'Listing workflows', status: 'complete' },
			]);
		});

		it('errors the task row on tool-error, with the error as detail', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(toolCallEvent('call-1', 'workflows', { action: 'list' }));
			emit(toolErrorEvent('call-1', 'permission denied'));

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(2);
			});
			expect(transport.append.mock.calls[1][0]).toEqual([
				{
					type: 'task_update',
					id: 'call-1',
					title: 'Listing workflows',
					status: 'error',
					details: 'permission denied',
				},
			]);
		});

		it('errors the task row on tool-interrupted', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(toolCallEvent('call-1', 'workflows', { action: 'list' }));
			emit(toolInterruptedEvent('call-1', 'process died'));

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(2);
			});
			expect(transport.append.mock.calls[1][0]).toEqual([
				{
					type: 'task_update',
					id: 'call-1',
					title: 'Listing workflows',
					status: 'error',
					details: 'process died',
				},
			]);
		});

		it('ignores tool events for a run once a plan exists', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(tasksUpdateEvent([{ id: 't1', description: 'a', status: 'in_progress' }]));
			transport.append.mockClear();

			emit(toolCallEvent('call-1', 'workflows', { action: 'list' }));
			emit(toolResultEvent('call-1'));

			expect(transport.append).not.toHaveBeenCalled();
		});
	});

	describe('text-delta coalescing', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it('coalesces deltas and flushes at most once per second', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(textDeltaEvent('Hello '));
			emit(textDeltaEvent('world'));
			expect(transport.append).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1000);

			expect(transport.append).toHaveBeenCalledTimes(1);
			expect(markdownChunks(transport.append.mock.calls[0][0])).toEqual([
				{ type: 'markdown_text', text: 'Hello world' },
			]);
		});

		it('separates successive markdown flushes with a blank line', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(textDeltaEvent('First chunk'));
			await vi.advanceTimersByTimeAsync(1000);
			emit(textDeltaEvent('Second chunk'));
			await vi.advanceTimersByTimeAsync(1000);

			expect(markdownChunks(transport.append.mock.calls[1][0])).toEqual([
				{ type: 'markdown_text', text: '\n\nSecond chunk' },
			]);
		});

		it('serializes flushes on a single in-flight promise chain instead of overlapping', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			let resolveFirst: (() => void) | undefined;
			transport.append.mockImplementationOnce(
				async () =>
					await new Promise<void>((resolve) => {
						resolveFirst = resolve;
					}),
			);

			emit(textDeltaEvent('first'));
			await vi.advanceTimersByTimeAsync(1000);
			expect(transport.append).toHaveBeenCalledTimes(1);

			emit(textDeltaEvent('second'));
			await vi.advanceTimersByTimeAsync(1000);

			// The second flush must not have run yet: the first append() call is
			// still in flight, and the queue must not fire overlapping appends.
			expect(transport.append).toHaveBeenCalledTimes(1);

			resolveFirst?.();
			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(2);
			});
		});

		it('does not flush when there is nothing buffered', async () => {
			const { renderer, transport, target } = createHarness();
			await renderer.attach('thread-1', target);

			await vi.advanceTimersByTimeAsync(3000);

			expect(transport.append).not.toHaveBeenCalled();
		});
	});

	describe('status events', () => {
		it('forwards the status message to setStatus', async () => {
			const { renderer, webClient, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(statusEvent('Thinking hard...'));

			await vi.waitFor(() => {
				expect(webClient.setStatus).toHaveBeenCalledWith(target.botToken, {
					channelId: target.channelId,
					threadTs: target.threadTs,
					status: 'Thinking hard...',
				});
			});
		});

		it('clears the status with an empty string', async () => {
			const { renderer, webClient, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(statusEvent(''));

			await vi.waitFor(() => {
				expect(webClient.setStatus).toHaveBeenCalledWith(
					target.botToken,
					expect.objectContaining({ status: '' }),
				);
			});
		});
	});

	describe('dropped event types', () => {
		it.each([
			['reasoning-delta', reasoningDeltaEvent],
			['text-block', textBlockEvent],
			['reasoning-block', reasoningBlockEvent],
			['thread-title-updated', threadTitleUpdatedEvent],
			['filesystem-request', filesystemRequestEvent],
		])('produces no Slack side effects for %s', async (_name, factory) => {
			const { renderer, transport, webClient, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(factory());
			await vi.waitFor(() => {
				expect(transport.append).not.toHaveBeenCalled();
			});
			expect(webClient.setStatus).not.toHaveBeenCalled();
			expect(webClient.postMessage).not.toHaveBeenCalled();
		});
	});

	describe('error event', () => {
		it('posts a plain-English failure line', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(errorEvent('The model ran out of context'));

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(1);
			});
			const chunks = markdownChunks(transport.append.mock.calls[0][0]);
			expect(chunks[0].text).toContain('The model ran out of context');
		});
	});

	describe('confirmation-request', () => {
		it('invokes the onConfirmationRequest seam and adds a pending task row', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);
			const onConfirmationRequest = vi
				.fn<
					(
						threadId: string,
						event: InstanceAiConfirmationRequestEvent,
						target: SlackStreamRendererTarget,
					) => Promise<void>
				>()
				.mockResolvedValue(undefined);
			renderer.onConfirmationRequest = onConfirmationRequest;

			const event = confirmationRequestEvent();
			emit(event);

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(1);
			});
			expect(onConfirmationRequest).toHaveBeenCalledWith('thread-1', event, target);
			expect(transport.append.mock.calls[0][0]).toEqual([
				{
					type: 'task_update',
					id: 'confirmation-request',
					title: 'Waiting for your go-ahead',
					status: 'pending',
				},
			]);
		});

		it('still adds the pending row when no handler is registered', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(confirmationRequestEvent());

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(1);
			});
		});

		it('logs and continues when the handler rejects', async () => {
			const { renderer, transport, logger, emit, target } = createHarness();
			await renderer.attach('thread-1', target);
			renderer.onConfirmationRequest = vi.fn().mockRejectedValue(new Error('card render failed'));

			emit(confirmationRequestEvent());

			await vi.waitFor(() => {
				expect(logger.error).toHaveBeenCalled();
			});
			expect(transport.append).toHaveBeenCalledTimes(1);
		});
	});

	describe('run-finish', () => {
		it('does not close the transport', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(runFinishEvent('completed'));

			expect(transport.close).not.toHaveBeenCalled();
		});

		it('posts the standard apology markdown on an errored run', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(runFinishEvent('error'));

			await vi.waitFor(() => {
				expect(transport.append).toHaveBeenCalledTimes(1);
			});
			const chunks = markdownChunks(transport.append.mock.calls[0][0]);
			expect(chunks[0].text).toBe(
				'I hit a problem and stopped. Steps marked done above did happen; nothing else was changed.',
			);
		});
	});

	describe('idle close', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it('closes and unsubscribes once the thread is fully idle, 5s after run-finish', async () => {
			const { renderer, transport, instanceAiService, emit, target, unsubscribe } = createHarness();
			await renderer.attach('thread-1', target);

			emit(runFinishEvent('completed'));
			expect(transport.close).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(5000);

			expect(transport.close).toHaveBeenCalledTimes(1);
			expect(unsubscribe).toHaveBeenCalledTimes(1);
			expect(instanceAiService.getThreadStatus).toHaveBeenCalledWith('thread-1');
		});

		it('keeps polling instead of closing when a follow-up run starts inside the debounce window', async () => {
			const { renderer, transport, instanceAiService, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(runFinishEvent('completed'));

			instanceAiService.getThreadStatus.mockReturnValueOnce(activeStatus());
			await vi.advanceTimersByTimeAsync(5000);
			expect(transport.close).not.toHaveBeenCalled();

			instanceAiService.getThreadStatus.mockReturnValueOnce(idleStatus());
			await vi.advanceTimersByTimeAsync(5000);
			expect(transport.close).toHaveBeenCalledTimes(1);
		});

		it('does not close while background tasks are still running', async () => {
			const { renderer, transport, instanceAiService, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(runFinishEvent('completed'));
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: false,
				isSuspended: false,
				backgroundTasks: [
					{ taskId: 'bg-1', role: 'observer', agentId: 'a1', status: 'running', startedAt: 0 },
				],
			});

			await vi.advanceTimersByTimeAsync(5000);
			expect(transport.close).not.toHaveBeenCalled();
		});
	});

	describe('stopped_by_user', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it('routes a cancel-run, stops flushing and cleans up', async () => {
			const { renderer, transport, instanceAiService, unsubscribe, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			transport.append.mockRejectedValueOnce(stoppedByUserError());
			emit(textDeltaEvent('hello'));
			await vi.advanceTimersByTimeAsync(1000);

			await vi.waitFor(() => {
				expect(instanceAiService.routeCancelRun).toHaveBeenCalledWith('thread-1');
			});
			expect(unsubscribe).toHaveBeenCalledTimes(1);
			expect(transport.close).not.toHaveBeenCalled();

			const callsBeforeMoreEvents = transport.append.mock.calls.length;
			emit(textDeltaEvent('more text after cancellation'));
			await vi.advanceTimersByTimeAsync(2000);
			expect(transport.append.mock.calls.length).toBe(callsBeforeMoreEvents);
		});
	});

	describe('message_not_in_streaming_state', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it('reopens a fresh stream in the same thread and keeps going', async () => {
			const { renderer, transport, webClient, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			const secondTransport = mock<StreamTransport>();
			secondTransport.append.mockResolvedValue(undefined);
			webClient.openStream.mockResolvedValueOnce(secondTransport);

			transport.append.mockRejectedValueOnce(notInStreamingStateError());
			emit(textDeltaEvent('first'));
			await vi.advanceTimersByTimeAsync(1000);

			await vi.waitFor(() => {
				expect(webClient.openStream).toHaveBeenCalledTimes(2);
			});

			emit(textDeltaEvent('second'));
			await vi.advanceTimersByTimeAsync(1000);

			await vi.waitFor(() => {
				expect(secondTransport.append).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('heartbeat', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it('appends a still-working detail to the active task after 25s of silence', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(toolCallEvent('call-1', 'workflows', { action: 'list' }));
			await vi.advanceTimersByTimeAsync(0);
			transport.append.mockClear();

			await vi.advanceTimersByTimeAsync(25000);

			expect(transport.append).toHaveBeenCalledTimes(1);
			expect(transport.append.mock.calls[0][0]).toEqual([
				{
					type: 'task_update',
					id: 'call-1',
					title: 'Listing workflows',
					status: 'in_progress',
					details: 'Still working, this step is a big one',
				},
			]);
		});

		it('resets the silence clock on every incoming event', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(toolCallEvent('call-1', 'workflows', { action: 'list' }));
			await vi.advanceTimersByTimeAsync(0);
			transport.append.mockClear();

			await vi.advanceTimersByTimeAsync(20000);
			emit(statusEvent('still going'));
			await vi.advanceTimersByTimeAsync(20000);

			expect(transport.append).not.toHaveBeenCalled();
		});

		it('does not nag about a task that has already completed', async () => {
			const { renderer, transport, emit, target } = createHarness();
			await renderer.attach('thread-1', target);

			emit(toolCallEvent('call-1', 'workflows', { action: 'list' }));
			emit(toolResultEvent('call-1'));
			await vi.advanceTimersByTimeAsync(0);
			transport.append.mockClear();

			await vi.advanceTimersByTimeAsync(25000);

			expect(transport.append).not.toHaveBeenCalled();
		});
	});
});
