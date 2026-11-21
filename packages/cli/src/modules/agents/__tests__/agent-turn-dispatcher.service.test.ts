import {
	AGENT_TURNS_CAPABILITY,
	type AgentSseEvent,
	type InstanceRegistration,
} from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { InstanceRegistryProxyService } from '@n8n/backend-services';
import type { AgentsConfig } from '@n8n/config';
import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AgentAppTurnService } from '../agent-app-turn.service';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentMainMemory } from '../queue/agent-main-memory.service';
import { AgentQueueMetrics, type AgentQueueMetricEvent } from '../queue/agent-queue-metrics';
import { AgentTurnGate } from '../queue/agent-turn-gate.service';
import type { AgentTurnEntry } from '../queue/agent-turn-runner';
import { AgentTurnNotAdmittedError } from '../queue/agent-turn-runner';
import type {
	AgentChannelInboundRequest,
	AgentAppChatRequest,
	AgentTaskRunRequest,
	AgentWebhookRespondRequest,
	AgentWakeRequest,
} from '../queue/agent-turn-request.types';
import { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue } from '../queue/agent-turn-queue.service';
import { testCluster, type TestClusterOptions } from './test-utils/cluster';
import { fakeRequests, testTurns } from './test-utils/turns';

const webhook: AgentWebhookRespondRequest = {
	kind: 'webhook-respond',
	agentId: 'agent-1',
	input: 'Hi',
	approvalBaseUrl: 'https://n8n.example.com/agent-webhook/agent-1',
};

const fullGate = () =>
	mock<AgentTurnGate>({
		waitForRoom: vi.fn(async () => ({
			admitted: false as const,
			reason: 'main-at-limit' as const,
			retryAfterSeconds: 17,
		})),
	});

/**
 * A real placement and gate over plain config, for a process in agent queue
 * mode. `workers` says whether an agent worker is registered.
 */
function queueMode(cluster: TestClusterOptions, { workers }: { workers: boolean }) {
	const config = {
		queueModeEnabled: true,
		workerEnabled: true,
		mainFallbackTurns: 0,
		mainMaxTurns: 20,
		mainMaxIntake: 0,
		mainMaxStreams: 0,
		queueMaxWaiting: 0,
		queueMaxWaitingPerAgent: 0,
		queueMaxWaitSeconds: 60,
	} as AgentsConfig;
	const registry = new InstanceRegistryProxyService();
	const instances = workers
		? [{ instanceType: 'worker', capabilities: [AGENT_TURNS_CAPABILITY] } as InstanceRegistration]
		: [];
	registry.registerProvider({
		getAllInstances: async () => instances,
		getLocalInstance: () => null,
	});
	const metrics = new AgentQueueMetrics();
	const events: AgentQueueMetricEvent[] = [];
	metrics.onEvent((event) => events.push(event));
	const gate = new AgentTurnGate(config, metrics, { isHigh: () => false } as AgentMainMemory);
	const agentCluster = testCluster({ queue: true, instanceKey: 'instance-a', ...cluster });
	const turnQueue = { waitingCount: async () => 0 } as AgentTurnQueue;
	const placement = new AgentTurnPlacement(
		config,
		agentCluster,
		registry,
		turnQueue,
		gate,
		metrics,
	);
	const turns = testTurns({
		cluster: agentCluster,
		placement,
		gate,
		agentsConfig: config,
		metrics,
	});
	const queuedStart = vi.spyOn(turns.queued, 'start');
	const inProcessStart = vi.spyOn(turns.inProcess, 'start');
	return { ...turns, placement, events, queuedStart, inProcessStart };
}

/** Resolves on the next turn of the event loop, after started handlers ran. */
const tick = async () => await new Promise((resolve) => setImmediate(resolve));

describe('InProcessTurnRunner', () => {
	it('sends the entries of a turn to its subscribers with consecutive sequence numbers', async () => {
		const { handlers, inProcess } = testTurns();
		handlers.handle('chat-resume', {
			mode: 'stream',
			run: async (_payload, { send }) => {
				send({ type: 'text-delta', id: 't', delta: 'a' });
				send({ type: 'text-delta', id: 't', delta: 'b' });
			},
			onError: () => {},
		});
		const entries: AgentTurnEntry[] = [];
		await inProcess.subscribe('turn-1', (entry) => entries.push(entry));

		await inProcess.start({ turnId: 'turn-1', payload: mock({ kind: 'chat-resume' }) });
		await inProcess.whenIdle();

		expect(entries.map((entry) => entry.sequence)).toEqual([1, 2, 3]);
		expect(entries[2]).toEqual({ sequence: 3, end: { outcome: 'done' } });
	});

	it('throws not admitted and runs nothing when the gate has no room', async () => {
		const run = vi.fn();
		const { handlers, inProcess } = testTurns({ gate: fullGate() });
		handlers.handle('webhook-respond', { mode: 'result', run });

		const start = inProcess.start({ turnId: 'turn-1', payload: webhook });

		await expect(start).rejects.toBeInstanceOf(AgentTurnNotAdmittedError);
		await expect(start).rejects.toMatchObject({ reason: 'main-at-limit', retryAfterSeconds: 17 });
		expect(run).not.toHaveBeenCalled();
		expect(inProcess.runningCount).toBe(0);
	});

	it('ends a cancelled turn as cancelled and aborts its handler', async () => {
		let signal: AbortSignal | undefined;
		const { handlers, inProcess } = testTurns();
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async (_payload, { abortSignal }) => {
				signal = abortSignal;
				await new Promise((resolve) => abortSignal.addEventListener('abort', resolve));
				return {};
			},
		});
		const entries: AgentTurnEntry[] = [];
		await inProcess.subscribe('turn-1', (entry) => entries.push(entry));

		await inProcess.start({ turnId: 'turn-1', payload: webhook });
		await tick();
		await inProcess.cancel('turn-1');
		await inProcess.whenIdle();

		expect(signal?.aborted).toBe(true);
		expect(entries).toEqual([{ sequence: 1, end: { outcome: 'cancelled' } }]);
	});

	it('skips the gate on an agent worker', async () => {
		const gate = fullGate();
		const { handlers, inProcess } = testTurns({
			gate,
			cluster: testCluster({ queue: true, instanceType: 'worker', instanceKey: 'worker-a' }),
		});
		handlers.handle('webhook-respond', { mode: 'result', run: async () => ({}) });

		await inProcess.start({ turnId: 'turn-1', payload: webhook });
		await inProcess.whenIdle();

		expect(gate.waitForRoom).not.toHaveBeenCalled();
	});

	it('refuses a public turn on a main in agent queue mode, as a last check', async () => {
		const run = vi.fn();
		const { handlers, inProcess } = queueMode({ instanceType: 'main' }, { workers: true });
		handlers.handle('webhook-respond', { mode: 'result', run });

		await expect(inProcess.start({ turnId: 'turn-1', payload: webhook })).rejects.toBeInstanceOf(
			UnexpectedError,
		);
		expect(run).not.toHaveBeenCalled();
	});

	it('runs a public turn on an agent worker, where mayRunHere is false', async () => {
		const run = vi.fn(async () => ({}));
		const { handlers, inProcess, placement } = queueMode(
			{ instanceType: 'worker' },
			{ workers: true },
		);
		handlers.handle('webhook-respond', { mode: 'result', run });
		expect(placement.mayRunHere('webhook-respond')).toBe(false);

		await inProcess.start({ turnId: 'turn-1', payload: webhook });
		await inProcess.whenIdle();

		expect(run).toHaveBeenCalledOnce();
	});
});

describe('AgentTurnDispatcher', () => {
	it('runs a result turn in this process when no agent worker is up', async () => {
		const { handlers, dispatcher, queued } = testTurns();
		const queuedStart = vi.spyOn(queued, 'start');
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async () => ({ status: 200 }),
		});

		await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toEqual({
			outcome: 'done',
			result: { status: 200 },
		});
		expect(queuedStart).not.toHaveBeenCalled();
	});

	it('rejects a result turn as busy when this process has no room', async () => {
		const run = vi.fn();
		const { handlers, dispatcher } = testTurns({ gate: fullGate() });
		handlers.handle('webhook-respond', { mode: 'result', run });

		await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toEqual({
			outcome: 'busy',
			retryAfterSeconds: 17,
		});
		expect(run).not.toHaveBeenCalled();
	});

	it('sends a busy error to a stream turn that this process rejects', async () => {
		const { dispatcher } = testTurns({ gate: fullGate() });
		const send = vi.fn();

		await dispatcher.stream(
			mock({ kind: 'chat-resume' }),
			{ send, abortSignal: new AbortController().signal },
			{ stopOnLeave: true },
		);

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'error', errorCode: 'main_busy', retryAfterSeconds: 17 }),
		);
	});

	it('stops a result turn when its caller leaves', async () => {
		let signal: AbortSignal | undefined;
		const { handlers, dispatcher } = testTurns();
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async (_payload, { abortSignal }) => {
				signal = abortSignal;
				await new Promise((resolve) => abortSignal.addEventListener('abort', resolve));
				return {};
			},
		});
		const leave = new AbortController();

		const result = dispatcher.result(webhook, leave.signal);
		await tick();
		leave.abort();

		await expect(result).resolves.toEqual({ outcome: 'left' });
		expect(signal?.aborted).toBe(true);
	});

	it('calls onRejected for a detached turn that this process rejects', async () => {
		const run = vi.fn();
		const onRejected = vi.fn(async () => {});
		const { handlers, dispatcher } = testTurns({ gate: fullGate() });
		handlers.handle('task-run', { mode: 'detached', run });

		await dispatcher.detached(mock<AgentTaskRunRequest>({ kind: 'task-run' }), {
			workerCapable: true,
			onRejected,
		});

		expect(onRejected).toHaveBeenCalledTimes(1);
		expect(run).not.toHaveBeenCalled();
	});

	it('asks the gate to wait for room for a wake, instead of rejecting it', async () => {
		const gate = mock<AgentTurnGate>({
			waitForRoom: vi.fn(async () => ({ admitted: true as const })),
		});
		const { handlers, dispatcher, inProcess } = testTurns({ gate });
		handlers.handle('wake', { mode: 'detached', run: async () => {} });

		await dispatcher.detached(mock<AgentWakeRequest>({ kind: 'wake' }), { workerCapable: true });
		await inProcess.whenIdle();

		expect(gate.waitForRoom).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ untilRoom: true }),
		);
	});

	it('sends a turn to an agent worker when one is up', async () => {
		const run = vi.fn();
		const placement = mock<AgentTurnPlacement>({
			dispatchEnabled: true,
			mayRunHere: () => true,
			workersAvailable: async () => true,
		});
		const { handlers, dispatcher, queued, inProcess } = testTurns({ placement });
		handlers.handle('webhook-respond', { mode: 'result', run });
		const queuedStart = vi.spyOn(queued, 'start');
		const inProcessStart = vi.spyOn(inProcess, 'start');
		run.mockResolvedValue({ status: 202 });

		await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toEqual({
			outcome: 'done',
			result: { status: 202 },
		});
		// The fake queue hands the job to the worker side of the queued runner.
		expect(queuedStart).toHaveBeenCalledTimes(1);
		expect(inProcessStart).not.toHaveBeenCalled();
		expect(run).toHaveBeenCalledTimes(1);
	});

	describe('public turns in agent queue mode', () => {
		it('rejects a public turn on a main as busy at once when no agent worker is up', async () => {
			const { handlers, dispatcher, inProcessStart, queuedStart, events } = queueMode(
				{ instanceType: 'main' },
				{ workers: false },
			);
			const run = vi.fn();
			handlers.handle('webhook-respond', { mode: 'result', run });

			await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toEqual({
				outcome: 'busy',
				retryAfterSeconds: expect.any(Number),
			});
			expect(inProcessStart).not.toHaveBeenCalled();
			expect(queuedStart).not.toHaveBeenCalled();
			expect(run).not.toHaveBeenCalled();
			expect(events).toContainEqual({ type: 'turn-rejected', reason: 'no-worker' });
		});

		it('sends a busy error to a public stream turn when no agent worker is up', async () => {
			const { dispatcher, inProcessStart } = queueMode(
				{ instanceType: 'main' },
				{ workers: false },
			);
			const send = vi.fn();

			await dispatcher.stream(
				mock({ kind: 'app-chat' }),
				{ send, abortSignal: new AbortController().signal },
				{ stopOnLeave: true },
			);

			expect(send).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'error', errorCode: 'main_busy' }),
			);
			expect(inProcessStart).not.toHaveBeenCalled();
		});

		it('sends a public turn from a main to an agent worker', async () => {
			const { handlers, dispatcher, inProcessStart, queuedStart } = queueMode(
				{ instanceType: 'main' },
				{ workers: true },
			);
			handlers.handle('webhook-respond', { mode: 'result', run: async () => ({ status: 200 }) });

			await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toEqual({
				outcome: 'done',
				result: { status: 200 },
			});
			expect(queuedStart).toHaveBeenCalledTimes(1);
			expect(inProcessStart).not.toHaveBeenCalled();
		});

		it('still runs an editor turn on a main when no agent worker is up', async () => {
			const { handlers, dispatcher, inProcessStart } = queueMode(
				{ instanceType: 'main' },
				{ workers: false },
			);
			const run = vi.fn(async () => {});
			handlers.handle('task-run', { mode: 'detached', run });

			await dispatcher.detached(mock<AgentTaskRunRequest>({ kind: 'task-run' }), {
				workerCapable: true,
			});

			expect(inProcessStart).toHaveBeenCalledTimes(1);
		});

		it('sends a public turn from a webhook process to an agent worker', async () => {
			const { handlers, dispatcher, inProcessStart, queuedStart } = queueMode(
				{ instanceType: 'webhook' },
				{ workers: true },
			);
			handlers.handle('webhook-respond', { mode: 'result', run: async () => ({ status: 200 }) });

			await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toEqual({
				outcome: 'done',
				result: { status: 200 },
			});
			expect(queuedStart).toHaveBeenCalledTimes(1);
			expect(inProcessStart).not.toHaveBeenCalled();
		});

		it('rejects a public turn on a webhook process when no agent worker is up', async () => {
			const { dispatcher, inProcessStart, queuedStart } = queueMode(
				{ instanceType: 'webhook' },
				{ workers: false },
			);

			await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toMatchObject(
				{
					outcome: 'busy',
				},
			);
			expect(inProcessStart).not.toHaveBeenCalled();
			expect(queuedStart).not.toHaveBeenCalled();
		});

		it('runs no turn of any kind on a webhook process', async () => {
			const { dispatcher, inProcessStart } = queueMode(
				{ instanceType: 'webhook' },
				{ workers: false },
			);
			const onRejected = vi.fn(async () => {});

			await dispatcher.detached(mock<AgentWakeRequest>({ kind: 'wake' }), {
				workerCapable: false,
				onRejected,
			});

			expect(inProcessStart).not.toHaveBeenCalled();
			expect(onRejected).toHaveBeenCalledTimes(1);
		});

		describe('app visitor turns on a webhook process', () => {
			const appChat: AgentAppChatRequest = {
				kind: 'app-chat',
				agentId: 'agent-1',
				projectId: 'project-1',
				sessionId: 'session-1',
				message: 'Hi',
				memory: { threadId: 'thread-1', resourceId: 'app:app-1:user:user-1' },
			};

			/** The app turn service registers its handlers on the process that serves the visitor. */
			const appTurns = (workers: boolean) => {
				const turns = queueMode({ instanceType: 'webhook' }, { workers });
				const orchestrator = mock<AgentExecutionOrchestratorService>();
				orchestrator.executeForChatPublished.mockImplementation(async function* () {
					yield* [];
				});
				const service = new AgentAppTurnService(
					mockLogger(),
					orchestrator,
					turns.dispatcher,
					turns.handlers,
				);
				return { ...turns, service, orchestrator };
			};

			const collect = async (events: AsyncIterable<AgentSseEvent>) => {
				const all: AgentSseEvent[] = [];
				for await (const event of events) all.push(event);
				return all;
			};

			it('registers the app handlers, but sends the turn to an agent worker', async () => {
				const { service, handlers, inProcessStart, queuedStart } = appTurns(true);

				expect(handlers.modeOf('app-chat')).toBe('stream');
				const events = await collect(service.events(appChat, new AbortController().signal));

				// The fake worker of the test runs the handler, as the agent worker would.
				expect(events).toEqual([{ type: 'done', sessionId: 'session-1' }]);
				expect(queuedStart).toHaveBeenCalledTimes(1);
				expect(inProcessStart).not.toHaveBeenCalled();
			});

			it('rejects the turn as busy, and runs nothing, when no agent worker is up', async () => {
				const { service, orchestrator, inProcessStart, queuedStart } = appTurns(false);

				const events = await collect(service.events(appChat, new AbortController().signal));

				expect(events).toEqual([
					expect.objectContaining({ type: 'error', errorCode: 'main_busy' }),
				]);
				expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
				expect(inProcessStart).not.toHaveBeenCalled();
				expect(queuedStart).not.toHaveBeenCalled();
			});
		});

		it('sends a public turn from an agent worker to the agent queue', async () => {
			const { handlers, dispatcher, inProcessStart, queuedStart } = queueMode(
				{ instanceType: 'worker' },
				{ workers: true },
			);
			handlers.handle('webhook-respond', { mode: 'result', run: async () => ({ status: 200 }) });

			await dispatcher.result(webhook, new AbortController().signal);

			expect(queuedStart).toHaveBeenCalledTimes(1);
			expect(inProcessStart).not.toHaveBeenCalled();
		});
	});
});

describe('AgentTurnDispatcher.submit (chat platform events)', () => {
	const inbound: AgentChannelInboundRequest = {
		kind: 'channel-inbound',
		agentId: 'agent-1',
		projectId: 'project-1',
		platform: 'slack',
		credentialId: 'cred-1',
		method: 'POST',
		url: 'https://n8n.example/agent-hook/agent-1/slack',
		headers: {},
		rawBody: '',
		receivedAt: '2026-11-21T00:00:00.000Z',
	};

	it('runs in this process in regular mode, and the full gate does not count it', async () => {
		const gate = fullGate();
		const { handlers, dispatcher, inProcess } = testTurns({ gate });
		const run = vi.fn(async () => {});
		handlers.handle('channel-inbound', { mode: 'detached', run });

		await expect(
			dispatcher.submit(inbound, { turnId: 'turn-1', ackWithinMs: 1_000 }),
		).resolves.toEqual({ outcome: 'accepted' });
		await inProcess.whenIdle();

		expect(run).toHaveBeenCalledTimes(1);
		expect(gate.waitForRoom).not.toHaveBeenCalled();
	});

	it('drops a retry with the same turn ID while the first delivery runs', async () => {
		const { handlers, dispatcher, inProcess } = testTurns();
		let finish!: () => void;
		handlers.handle('channel-inbound', {
			mode: 'detached',
			run: async () => await new Promise<void>((resolve) => (finish = resolve)),
		});

		await dispatcher.submit(inbound, { turnId: 'turn-1', ackWithinMs: 1_000 });
		await tick();
		await expect(
			dispatcher.submit(inbound, { turnId: 'turn-1', ackWithinMs: 1_000 }),
		).resolves.toEqual({ outcome: 'duplicate' });
		finish();
		await inProcess.whenIdle();
	});

	it.each(['webhook', 'main'] as const)(
		'stores the event for a later worker on a %s process in agent queue mode when no agent worker is up',
		async (instanceType) => {
			const { dispatcher, inProcessStart, queuedStart, requests, events } = queueMode(
				{ instanceType },
				{ workers: false },
			);

			await expect(
				dispatcher.submit(inbound, { turnId: 'turn-1', ackWithinMs: 1_000 }),
			).resolves.toEqual({ outcome: 'accepted' });
			expect(queuedStart).toHaveBeenCalledTimes(1);
			expect(requests.createPendingIfAbsent).toHaveBeenCalledWith('turn-1', inbound);
			expect(inProcessStart).not.toHaveBeenCalled();
			expect(events).not.toContainEqual({ type: 'turn-rejected', reason: 'no-worker' });
		},
	);

	it('rejects the event as busy before the ack when the agent queue is down', async () => {
		const placement = mock<AgentTurnPlacement>({
			mayRunHere: () => false,
			workersAvailable: async () => false,
			queueFull: async () => false,
			retryAfterSeconds: async () => 9,
		});
		const turnQueue = mock<AgentTurnQueue>();
		turnQueue.enqueueRequest.mockRejectedValue(new Error('Redis unavailable'));
		const { requests, rows } = fakeRequests();
		const { dispatcher } = testTurns({ placement, turnQueue, requests });

		await expect(
			dispatcher.submit(inbound, { turnId: 'turn-1', ackWithinMs: 1_000 }),
		).resolves.toEqual({ outcome: 'busy', retryAfterSeconds: 9 });
		expect(rows.size).toBe(0);
	});

	it('rejects the event as busy before the ack when the agent queue is full', async () => {
		const placement = mock<AgentTurnPlacement>({
			mayRunHere: () => false,
			workersAvailable: async () => true,
			queueFull: async () => true,
			retryAfterSeconds: async () => 9,
		});
		const { dispatcher, requests } = testTurns({ placement });

		await expect(
			dispatcher.submit(inbound, { turnId: 'turn-1', ackWithinMs: 1_000 }),
		).resolves.toEqual({ outcome: 'busy', retryAfterSeconds: 9 });
		expect(requests.createPendingIfAbsent).not.toHaveBeenCalled();
	});

	it('sends the event to an agent worker in agent queue mode, and drops a retry by its row', async () => {
		const { handlers, dispatcher, queuedStart, inProcessStart, requests } = queueMode(
			{ instanceType: 'webhook' },
			{ workers: true },
		);
		handlers.handle('channel-inbound', { mode: 'detached', run: async () => {} });
		vi.mocked(requests.createPendingIfAbsent).mockResolvedValueOnce(false);

		await expect(
			dispatcher.submit(inbound, { turnId: 'turn-1', ackWithinMs: 1_000 }),
		).resolves.toEqual({ outcome: 'duplicate' });
		expect(queuedStart).toHaveBeenCalledTimes(1);
		expect(inProcessStart).not.toHaveBeenCalled();
	});

	it('answers within the ack time while a turn that is not durable still waits', async () => {
		const placement = mock<AgentTurnPlacement>({
			mayRunHere: () => false,
			workersAvailable: async () => true,
		});
		const { dispatcher, queued } = testTurns({ placement });
		vi.spyOn(queued, 'start').mockReturnValue(new Promise(() => {}));

		await expect(
			dispatcher.submit(webhook, { turnId: 'turn-1', ackWithinMs: 10 }),
		).resolves.toEqual({ outcome: 'accepted' });
	});

	it('answers for a chat platform event only once it is stored or rejected', async () => {
		const placement = mock<AgentTurnPlacement>({
			mayRunHere: () => false,
			workersAvailable: async () => true,
		});
		const { dispatcher, queued } = testTurns({ placement });
		vi.spyOn(queued, 'start').mockImplementation(async () => {
			await new Promise((resolve) => setTimeout(resolve, 30));
			throw new AgentTurnNotAdmittedError('agent-queue-full', 21);
		});

		// A late rejection is not hidden behind an early ack, so the platform retries.
		await expect(dispatcher.submit(inbound, { turnId: 'turn-1', ackWithinMs: 1 })).resolves.toEqual(
			{ outcome: 'busy', retryAfterSeconds: 21 },
		);
	});
});
