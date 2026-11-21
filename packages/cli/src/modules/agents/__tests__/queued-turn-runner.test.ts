import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentTurnGate } from '../queue/agent-turn-gate.service';
import type { AgentClusterService } from '../agent-cluster.service';
import type { AgentQueueMetricEvent } from '../queue/agent-queue-metrics';
import { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue } from '../queue/agent-turn-queue.service';
import type { AgentWebhookRespondRequest } from '../queue/agent-turn-request.types';
import {
	AgentTurnDuplicateError,
	type AgentTurnEntry,
	AgentTurnNotAdmittedError,
} from '../queue/agent-turn-runner';
import { QueuedTurnRunner } from '../queue/queued-turn-runner';
import { testCluster } from './test-utils/cluster';
import { fakeStreamChannel } from './test-utils/stream-channel';
import { fakeRequests, testTurns } from './test-utils/turns';

const webhook: AgentWebhookRespondRequest = {
	kind: 'webhook-respond',
	agentId: 'agent-1',
	input: 'Hi',
	approvalBaseUrl: 'https://n8n.example.com/agent-webhook/agent-1',
};

function setup(
	options: {
		queueFull?: boolean;
		queueMaxWaitSeconds?: number;
		turnQueue?: AgentTurnQueue;
		mayFallBack?: boolean;
		cluster?: AgentClusterService;
		/** Whether this process may run turns itself. Pass a function for each kind. */
		mayRunHere?: (kind: string) => boolean;
		queueMaxWaitingPerAgent?: number;
	} = {},
) {
	const placement = mock<AgentTurnPlacement>({
		dispatchEnabled: true,
		mayRunHere: options.mayRunHere ?? (() => true),
		workersAvailable: async () => true,
		queueFull: async () => options.queueFull ?? false,
		retryAfterSeconds: async () => 12,
		mayFallBack: vi.fn(async () => options.mayFallBack ?? false),
	});
	const gate = mock<AgentTurnGate>({
		waitForRoom: vi.fn(async () => ({ admitted: true as const })),
	});
	const { requests, rows } = fakeRequests();
	const fake = fakeStreamChannel();
	const turns = testTurns({
		cluster: options.cluster,
		placement,
		gate,
		requests,
		channel: fake.channel,
		turnQueue: options.turnQueue,
		agentsConfig: mock<AgentsConfig>({
			queueMaxWaitSeconds: options.queueMaxWaitSeconds ?? 0,
			queueMaxWaitingPerAgent: options.queueMaxWaitingPerAgent ?? 0,
		}),
	});
	return { ...turns, requests, rows, gate, placement, ...fake };
}

/** Collect the entries of one turn, and resolve with them when it ends. */
async function follow(runner: QueuedTurnRunner, turnId: string) {
	const entries: AgentTurnEntry[] = [];
	let resolveEnd!: () => void;
	const ended = new Promise<void>((resolve) => {
		resolveEnd = resolve;
	});
	const subscription = await runner.subscribe(turnId, (entry) => {
		entries.push(entry);
		if ('end' in entry) resolveEnd();
	});
	return { entries, ended, subscription };
}

const useFakeTimers = () =>
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

const useFakeTimersWithDate = () =>
	vi.useFakeTimers({
		toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
	});

describe('QueuedTurnRunner', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('relays the events and the end of a turn that a worker runs, in sequence order', async () => {
		const { queued, handlers, rows, listening } = setup();
		handlers.handle('app-chat', {
			mode: 'stream',
			run: async (_request, { send }) => {
				send({ type: 'text-delta', delta: 'a' } as never);
				send({ type: 'text-delta', delta: 'b' } as never);
			},
			onError: () => {},
		});
		const { entries, ended } = await follow(queued, 'turn-1');
		// Shutdown waits for the turns that a caller of this process follows.
		expect(queued.followedCount).toBe(1);

		await queued.start({ turnId: 'turn-1', payload: { kind: 'app-chat' } as never });
		await ended;

		expect(entries.map((entry) => entry.sequence)).toEqual([1, 2, 3]);
		expect(entries.at(-1)).toEqual({ sequence: 3, end: { outcome: 'done' } });
		await queued.whenIdle();
		expect(rows.size).toBe(0);
		// The main stops reading the channel of a turn that ended.
		await vi.waitFor(() => expect(listening()).toEqual([]));
		expect(queued.followedCount).toBe(0);
	});

	it('rejects a turn at once when the agent queue is full', async () => {
		const { queued, requests } = setup({ queueFull: true });

		await expect(queued.start({ turnId: 'turn-1', payload: webhook })).rejects.toEqual(
			new AgentTurnNotAdmittedError('queue-full', 12),
		);
		expect(requests.createPendingIfAbsent).not.toHaveBeenCalled();
	});

	it('queues a turn that must run even when the agent queue is full', async () => {
		const { queued, handlers } = setup({ queueFull: true });
		const run = vi.fn(async () => {});
		handlers.handle('wake', { mode: 'detached', run });

		await queued.start({ turnId: 'turn-1', payload: { kind: 'wake' } as never, mustRun: true });
		await queued.whenIdle();
		await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
	});

	it('rejects a turn that no worker claims within the max wait, and keeps workers off it', async () => {
		useFakeTimers();
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, worker, handlers, rows, gate } = setup({ turnQueue, queueMaxWaitSeconds: 5 });
		const run = vi.fn(async () => ({}));
		handlers.handle('webhook-respond', { mode: 'result', run });

		const started = queued.start({ turnId: 'turn-1', payload: webhook });
		const failed = expect(started).rejects.toEqual(
			new AgentTurnNotAdmittedError('wait-too-long', 12),
		);
		await vi.advanceTimersByTimeAsync(5_000);
		await failed;
		expect(gate.rejected).toHaveBeenCalledWith('wait-too-long');
		expect(rows.size).toBe(0);

		// The job no longer counts as waiting.
		expect(turnQueue.removeRequest).toHaveBeenCalledWith('turn-1');
		// A worker that takes the job late finds no row.
		await worker.runJob('turn-1');
		expect(run).not.toHaveBeenCalled();
	});

	it('ends a claimed turn as lost when the worker goes silent', async () => {
		useFakeTimers();
		// A worker claims the turn and then goes silent.
		const worker: { fake?: ReturnType<typeof setup> } = {};
		const turnQueue = mock<AgentTurnQueue>({
			enqueueRequest: async (turnId) => {
				await worker.fake?.requests.claim(turnId, 'worker-1');
				await worker.fake?.channel.publishTo(`turn:${turnId}`, JSON.stringify({ type: 'claimed' }));
			},
		});
		const fake = setup({ turnQueue });
		worker.fake = fake;
		const { entries, ended } = await follow(fake.queued, 'turn-1');

		await fake.queued.start({ turnId: 'turn-1', payload: webhook });
		await vi.advanceTimersByTimeAsync(QueuedTurnRunner.LOST_AFTER_MS);
		await ended;

		expect(entries).toEqual([{ sequence: 1, end: { outcome: 'lost' } }]);
	});

	it('ends a turn as lost when a message of the worker is lost', async () => {
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, channel, listening, rows } = setup({ turnQueue });
		const { entries, ended } = await follow(queued, 'turn-1');
		const started = queued.start({ turnId: 'turn-1', payload: webhook });
		await vi.waitFor(() => expect(rows.size).toBe(1));
		const send = async (message: unknown) =>
			await channel.publishTo('turn:turn-1', JSON.stringify(message));

		await send({ type: 'entries', entries: [{ sequence: 1, event: { type: 'text-delta' } }] });
		await started;
		// The batch with sequence 2 never arrives.
		await send({ type: 'entries', entries: [{ sequence: 3, event: { type: 'text-delta' } }] });
		await ended;

		expect(entries.map((entry) => entry.sequence)).toEqual([1, 2]);
		expect(entries.at(-1)).toEqual({ sequence: 2, end: { outcome: 'lost' } });
		await vi.waitFor(() => expect(listening()).toEqual([]));
	});

	it('ends a turn as lost when a heartbeat shows an entry that never arrived', async () => {
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, channel, rows } = setup({ turnQueue });
		const { entries, ended } = await follow(queued, 'turn-1');
		const started = queued.start({ turnId: 'turn-1', payload: webhook });
		await vi.waitFor(() => expect(rows.size).toBe(1));

		await channel.publishTo('turn:turn-1', JSON.stringify({ type: 'heartbeat', sequence: 0 }));
		await started;
		await channel.publishTo('turn:turn-1', JSON.stringify({ type: 'heartbeat', sequence: 1 }));
		await ended;

		expect(entries).toEqual([{ sequence: 1, end: { outcome: 'lost' } }]);
	});

	it('ends a turn as failed when its handler throws', async () => {
		const { queued, handlers, rows } = setup();
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async () => {
				throw new Error('Model unavailable');
			},
		});
		const { entries, ended } = await follow(queued, 'turn-1');

		await queued.start({ turnId: 'turn-1', payload: webhook });
		await ended;

		expect(entries).toEqual([{ sequence: 1, end: { outcome: 'failed' } }]);
		await queued.whenIdle();
		expect(rows.size).toBe(0);
	});

	it('keeps a long turn alive with heartbeats', async () => {
		useFakeTimers();
		const { queued, handlers } = setup();
		let finish!: () => void;
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async () => {
				await new Promise<void>((resolve) => {
					finish = resolve;
				});
				return { status: 200 };
			},
		});
		const { entries, ended } = await follow(queued, 'turn-1');

		const started = queued.start({ turnId: 'turn-1', payload: webhook });
		await vi.advanceTimersByTimeAsync(0);
		await started;
		await vi.advanceTimersByTimeAsync(QueuedTurnRunner.LOST_AFTER_MS * 2);
		finish();
		await vi.advanceTimersByTimeAsync(0);
		await ended;

		expect(entries).toEqual([{ sequence: 1, end: { outcome: 'done', result: { status: 200 } } }]);
	});

	it('stops a running turn on the worker through the control channel', async () => {
		const { queued, worker, handlers } = setup();
		await worker.startWorker();
		let started!: () => void;
		const running = new Promise<void>((resolve) => {
			started = resolve;
		});
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async (_request, { abortSignal }) => {
				started();
				await new Promise((resolve) => abortSignal.addEventListener('abort', resolve));
				return {};
			},
		});
		const { entries, ended } = await follow(queued, 'turn-1');

		await queued.start({ turnId: 'turn-1', payload: webhook });
		await running;
		await queued.cancel('turn-1');
		await ended;

		expect(entries.at(-1)).toMatchObject({ end: { outcome: 'cancelled' } });
	});

	it('gives up the place of a waiting turn when its caller leaves', async () => {
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, rows } = setup({ turnQueue });

		const started = queued.start({ turnId: 'turn-1', payload: webhook });
		await vi.waitFor(() => expect(rows.size).toBe(1));
		await queued.cancel('turn-1');

		await expect(started).rejects.toMatchObject({ reason: 'left' });
		expect(rows.size).toBe(0);
		expect(turnQueue.removeRequest).toHaveBeenCalledWith('turn-1');
	});

	it('stops the worker turn when the caller leaves just after a worker claimed it', async () => {
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, worker, handlers, requests, rows, channel } = setup({ turnQueue });
		await worker.startWorker();
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async (_request, { abortSignal }) => {
				await new Promise((resolve) => abortSignal.addEventListener('abort', resolve));
				return {};
			},
		});
		const { entries, ended } = await follow(queued, 'turn-1');
		const started = queued.start({ turnId: 'turn-1', payload: webhook });
		await vi.waitFor(() => expect(rows.size).toBe(1));

		// The caller leaves right after the worker claims, before the `claimed` message arrives.
		let cancelled: Promise<void> | undefined;
		const claim = requests.claim.getMockImplementation();
		requests.claim.mockImplementationOnce(async (id, instanceKey) => {
			const payload = await claim?.(id, instanceKey);
			cancelled = queued.cancel('turn-1');
			return payload ?? null;
		});
		const job = worker.runJob('turn-1');

		await started;
		await cancelled;
		await job;
		await ended;
		expect(channel.cancel).toHaveBeenCalledWith('turn-1');
		expect(entries.at(-1)).toMatchObject({ end: { outcome: 'cancelled' } });
		expect(rows.size).toBe(0);
	});

	it('stops the worker turn when the caller leaves and the main loses the claim', async () => {
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, rows, channel } = setup({ turnQueue });
		const started = queued.start({ turnId: 'turn-1', payload: webhook });
		await vi.waitFor(() => expect(rows.size).toBe(1));
		// A worker claimed the row, and its `claimed` message has not arrived yet.
		const row = rows.get('turn-1');
		if (row) row.claimedBy = 'worker-1';

		await queued.cancel('turn-1');

		await started;
		expect(channel.cancel).toHaveBeenCalledWith('turn-1');
		expect(rows.size).toBe(1);
	});

	it('runs a turn that must run here when the main may fall back', async () => {
		useFakeTimers();
		// The request job is lost: no worker ever sees it.
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, handlers, rows, placement } = setup({ turnQueue, mayFallBack: true });
		const run = vi.fn(async () => {});
		handlers.handle('wake', { mode: 'detached', run });

		const started = queued.start({
			turnId: 'turn-1',
			payload: { kind: 'wake' } as never,
			mustRun: true,
		});
		await vi.advanceTimersByTimeAsync(AgentTurnPlacement.FALLBACK_WAIT_MS);
		await started;
		await queued.whenIdle();

		expect(placement.mayFallBack).toHaveBeenCalledWith(expect.any(Number), 'request', 'wake');
		expect(run).toHaveBeenCalledOnce();
		expect(turnQueue.removeRequest).toHaveBeenCalledWith('turn-1');
		expect(rows.size).toBe(0);
	});

	it('runs a turn that must run here once its job is presumed lost', async () => {
		useFakeTimersWithDate();
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const cluster = testCluster({ instanceKey: 'main-1' });
		const { queued, handlers, gate, metrics } = setup({ turnQueue, cluster });
		const events: AgentQueueMetricEvent[] = [];
		metrics.onEvent((event) => events.push(event));
		const run = vi.fn(async () => {});
		handlers.handle('wake', { mode: 'detached', run });

		const started = queued.start({
			turnId: 'turn-1',
			payload: { kind: 'wake' } as never,
			mustRun: true,
		});
		await vi.advanceTimersByTimeAsync(QueuedTurnRunner.MAX_UNCLAIMED_MS - 1);
		expect(run).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(AgentTurnPlacement.FALLBACK_WAIT_MS);
		await started;
		await queued.whenIdle();

		expect(run).toHaveBeenCalledOnce();
		expect(gate.waitForRoom).toHaveBeenCalledWith(
			'resume',
			expect.objectContaining({ untilRoom: true }),
		);
		expect(events).toContainEqual({ type: 'fallback', path: 'request' });
	});

	it('rejects a turn with no wait limit once its job is presumed lost', async () => {
		useFakeTimersWithDate();
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, rows, listening } = setup({ turnQueue, queueMaxWaitSeconds: 0 });

		const started = queued.start({ turnId: 'turn-1', payload: webhook });
		const failed = expect(started).rejects.toEqual(
			new AgentTurnNotAdmittedError('wait-too-long', 12),
		);
		await vi.advanceTimersByTimeAsync(
			QueuedTurnRunner.MAX_UNCLAIMED_MS + AgentTurnPlacement.FALLBACK_WAIT_MS,
		);
		await failed;
		expect(rows.size).toBe(0);
		expect(listening()).toEqual([]);
	});

	it('tries a failed claim again, and does not treat it as a worker claim', async () => {
		useFakeTimers();
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, requests, rows } = setup({ turnQueue, queueMaxWaitSeconds: 5 });
		const { entries } = await follow(queued, 'turn-1');

		const started = queued.start({ turnId: 'turn-1', payload: webhook });
		const failed = expect(started).rejects.toEqual(
			new AgentTurnNotAdmittedError('wait-too-long', 12),
		);
		await vi.advanceTimersByTimeAsync(0);
		requests.claim.mockRejectedValueOnce(new Error('Database unavailable'));
		await vi.advanceTimersByTimeAsync(5_000);
		expect(rows.size).toBe(1);

		await vi.advanceTimersByTimeAsync(QueuedTurnRunner.CLAIM_RETRY_MS);
		await failed;
		expect(rows.size).toBe(0);
		// The turn never ended as lost.
		await vi.advanceTimersByTimeAsync(QueuedTurnRunner.LOST_AFTER_MS);
		expect(entries).toEqual([]);
	});

	it('rejects the turn when the job cannot be sent, and removes the row', async () => {
		const turnQueue = mock<AgentTurnQueue>();
		turnQueue.enqueueRequest.mockRejectedValue(new Error('Redis unavailable'));
		const { queued, rows, listening, gate } = setup({ turnQueue });

		await expect(queued.start({ turnId: 'turn-1', payload: webhook })).rejects.toMatchObject({
			reason: 'queue-unavailable',
		});
		expect(gate.rejected).toHaveBeenCalledWith('queue-unavailable');
		expect(rows.size).toBe(0);
		expect(listening()).toEqual([]);
	});

	it('never falls back to this process for a turn that may not run here', async () => {
		useFakeTimers();
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, handlers, rows, placement } = setup({
			turnQueue,
			mayFallBack: true,
			mayRunHere: () => false,
		});
		const run = vi.fn(async () => ({}));
		handlers.handle('webhook-respond', { mode: 'result', run });

		void queued.start({ turnId: 'turn-1', payload: webhook }).catch(() => {});
		await vi.advanceTimersByTimeAsync(AgentTurnPlacement.FALLBACK_WAIT_MS * 3);

		expect(placement.mayFallBack).not.toHaveBeenCalled();
		expect(run).not.toHaveBeenCalled();
		expect(rows.get('turn-1')?.claimedBy).toBeNull();
		await queued.cancel('turn-1');
	});

	it('rejects a must-run turn that may not run here once its job is presumed lost', async () => {
		useFakeTimersWithDate();
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { queued, handlers, rows } = setup({
			turnQueue,
			cluster: testCluster({ queue: true, instanceType: 'webhook', instanceKey: 'webhook-1' }),
			mayRunHere: () => false,
		});
		const run = vi.fn(async () => {});
		handlers.handle('wake', { mode: 'detached', run });

		const started = queued.start({
			turnId: 'turn-1',
			payload: { kind: 'wake' } as never,
			mustRun: true,
		});
		const failed = expect(started).rejects.toMatchObject({ reason: 'wait-too-long' });
		await vi.advanceTimersByTimeAsync(
			QueuedTurnRunner.MAX_UNCLAIMED_MS + AgentTurnPlacement.FALLBACK_WAIT_MS,
		);
		await failed;

		expect(run).not.toHaveBeenCalled();
		expect(rows.size).toBe(0);
	});

	describe('waiting public turns of each agent', () => {
		const otherAgent: AgentWebhookRespondRequest = { ...webhook, agentId: 'agent-2' };

		it('rejects a public turn when its agent already has the most waiting turns', async () => {
			const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
			const { queued, rows, gate, requests } = setup({ turnQueue, queueMaxWaitingPerAgent: 2 });

			const first = queued.start({ turnId: 'turn-1', payload: webhook });
			const second = queued.start({ turnId: 'turn-2', payload: webhook });
			await vi.waitFor(() => expect(rows.size).toBe(2));

			await expect(queued.start({ turnId: 'turn-3', payload: webhook })).rejects.toEqual(
				new AgentTurnNotAdmittedError('agent-queue-full', 12),
			);
			expect(gate.rejected).toHaveBeenCalledWith('agent-queue-full');
			expect(requests.countPendingForAgent).toHaveBeenCalledWith('agent-1', {
				since: expect.any(Date),
				durableSince: expect.any(Date),
			});
			expect(rows.has('turn-3')).toBe(false);

			// Another agent still has room.
			const other = queued.start({ turnId: 'turn-4', payload: otherAgent });
			await vi.waitFor(() => expect(rows.size).toBe(3));

			for (const turnId of ['turn-1', 'turn-2', 'turn-4']) await queued.cancel(turnId);
			await Promise.allSettled([first, second, other]);
		});

		it('does not count claimed turns as waiting', async () => {
			const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
			const { queued, rows } = setup({ turnQueue, queueMaxWaitingPerAgent: 1 });

			const first = queued.start({ turnId: 'turn-1', payload: webhook });
			await vi.waitFor(() => expect(rows.size).toBe(1));
			const row = rows.get('turn-1');
			if (row) row.claimedBy = 'worker-1';

			const second = queued.start({ turnId: 'turn-2', payload: webhook });
			await vi.waitFor(() => expect(rows.size).toBe(2));

			for (const turnId of ['turn-1', 'turn-2']) await queued.cancel(turnId);
			await Promise.allSettled([first, second]);
		});

		it('does not apply to turns that are not public, or with no limit', async () => {
			const { queued, requests, handlers } = setup({ queueMaxWaitingPerAgent: 0 });
			handlers.handle('webhook-respond', { mode: 'result', run: async () => ({}) });
			await queued.start({ turnId: 'turn-1', payload: webhook });
			expect(requests.countPendingForAgent).not.toHaveBeenCalled();

			const limited = setup({ queueMaxWaitingPerAgent: 1 });
			limited.handlers.handle('task-run', { mode: 'detached', run: async () => {} });
			await limited.queued.start({
				turnId: 'turn-2',
				payload: { kind: 'task-run', agentId: 'agent-1' } as never,
			});
			expect(limited.requests.countPendingForAgent).not.toHaveBeenCalled();
			await Promise.all([queued.whenIdle(), limited.queued.whenIdle()]);
		});

		it('only counts rows younger than the max wait and a margin', async () => {
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(new Date('2026-11-21T12:00:00Z'));
			const { queued, requests, handlers } = setup({
				queueMaxWaitingPerAgent: 5,
				queueMaxWaitSeconds: 60,
			});
			handlers.handle('webhook-respond', { mode: 'result', run: async () => ({}) });

			await queued.start({ turnId: 'turn-1', payload: webhook });

			expect(requests.countPendingForAgent).toHaveBeenCalledWith('agent-1', {
				since: new Date(Date.now() - 60_000 - QueuedTurnRunner.AGENT_WAITING_MARGIN_MS),
				// A chat platform event waits for a worker for much longer, so it counts for longer.
				durableSince: new Date(Date.now() - QueuedTurnRunner.DURABLE_REQUEST_MS),
			});
			await queued.whenIdle();
		});

		it('admits the turn when the count fails', async () => {
			const { queued, requests, handlers } = setup({ queueMaxWaitingPerAgent: 1 });
			handlers.handle('webhook-respond', { mode: 'result', run: async () => ({}) });
			requests.countPendingForAgent.mockRejectedValueOnce(new Error('Database unavailable'));

			await expect(queued.start({ turnId: 'turn-1', payload: webhook })).resolves.toBeUndefined();
			await queued.whenIdle();
		});
	});

	it('removes only the rows that are older than the stale age', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-11-21T12:00:00Z'));
		const { queued, requests } = setup();
		await queued.removeStaleRequests();
		expect(requests.removeStale).toHaveBeenCalledWith({
			cutoff: new Date(Date.now() - QueuedTurnRunner.STALE_REQUEST_MS),
			durableCutoff: new Date(Date.now() - QueuedTurnRunner.DURABLE_REQUEST_MS),
		});

		// A failed delete is only logged.
		requests.removeStale.mockRejectedValueOnce(new Error('Database unavailable'));
		await expect(queued.removeStaleRequests()).resolves.toBeUndefined();
	});

	describe('durable turns (chat platform events)', () => {
		const inbound = {
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
		} as const;

		it('resolves once the turn is stored, and never rejects it for the max wait', async () => {
			useFakeTimersWithDate();
			const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
			const { queued, rows, gate, listening, worker, handlers } = setup({
				turnQueue,
				queueMaxWaitSeconds: 5,
				mayRunHere: () => false,
			});
			const run = vi.fn(async () => {});
			handlers.handle('channel-inbound', { mode: 'detached', run });

			await expect(queued.start({ turnId: 'turn-1', payload: inbound })).resolves.toBeUndefined();
			// No channel is read for a turn that no caller follows.
			expect(listening()).toEqual([]);

			await vi.advanceTimersByTimeAsync(
				QueuedTurnRunner.MAX_UNCLAIMED_MS + AgentTurnPlacement.FALLBACK_WAIT_MS * 2,
			);
			expect(rows.get('turn-1')?.claimedBy).toBeNull();
			expect(gate.rejected).not.toHaveBeenCalled();
			expect(turnQueue.removeRequest).not.toHaveBeenCalled();

			// A worker that registers later still runs the event.
			await worker.runJob('turn-1');
			expect(run).toHaveBeenCalledOnce();
			expect(rows.size).toBe(0);
		});

		it('drops a retry of a stored event as a duplicate', async () => {
			const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: vi.fn(async () => {}) });
			const { queued } = setup({ turnQueue });

			await queued.start({ turnId: 'turn-1', payload: inbound });

			await expect(queued.start({ turnId: 'turn-1', payload: inbound })).rejects.toBeInstanceOf(
				AgentTurnDuplicateError,
			);
			expect(turnQueue.enqueueRequest).toHaveBeenCalledOnce();
		});

		it('still rejects the event at intake when the agent queue is full', async () => {
			const { queued, rows } = setup({ queueFull: true });

			await expect(queued.start({ turnId: 'turn-1', payload: inbound })).rejects.toEqual(
				new AgentTurnNotAdmittedError('queue-full', 12),
			);
			expect(rows.size).toBe(0);
		});

		it('still rejects the event at intake when its agent has the most waiting turns', async () => {
			const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
			const { queued, rows } = setup({ turnQueue, queueMaxWaitingPerAgent: 1 });

			await queued.start({ turnId: 'turn-1', payload: inbound });

			await expect(queued.start({ turnId: 'turn-2', payload: inbound })).rejects.toEqual(
				new AgentTurnNotAdmittedError('agent-queue-full', 12),
			);
			expect(rows.has('turn-2')).toBe(false);
		});

		it('rejects the event and removes the row when the job cannot be sent', async () => {
			const turnQueue = mock<AgentTurnQueue>();
			turnQueue.enqueueRequest.mockRejectedValue(new Error('Redis unavailable'));
			const { queued, rows } = setup({ turnQueue });

			await expect(queued.start({ turnId: 'turn-1', payload: inbound })).rejects.toMatchObject({
				reason: 'queue-unavailable',
			});
			expect(rows.size).toBe(0);
		});

		it('logs and counts the events that expired, and sends the jobs of waiting ones again', async () => {
			const turnQueue = mock<AgentTurnQueue>({
				isReady: true,
				enqueueRequest: vi.fn(async () => {}),
			});
			const { queued, requests, metrics } = setup({ turnQueue });
			const events: AgentQueueMetricEvent[] = [];
			metrics.onEvent((event) => events.push(event));
			requests.removeStale.mockResolvedValueOnce({ removed: 3, expiredDurable: 2 });
			requests.findUnclaimedDurable.mockResolvedValueOnce([
				{ id: 'turn-1', kind: 'channel-inbound' },
			]);

			await queued.removeStaleRequests();

			expect(events).toContainEqual({ type: 'turns-expired', count: 2 });
			expect(requests.findUnclaimedDurable).toHaveBeenCalledWith(
				expect.any(Date),
				QueuedTurnRunner.DURABLE_REQUEUE_BATCH,
			);
			expect(turnQueue.enqueueRequest).toHaveBeenCalledWith('turn-1', expect.any(Number));
		});
	});
});
