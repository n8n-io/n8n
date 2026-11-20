import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentTurnGate } from '../queue/agent-turn-gate.service';
import type { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue } from '../queue/agent-turn-queue.service';
import type { AgentWebhookRespondRequest } from '../queue/agent-turn-request.types';
import { type AgentTurnEntry, AgentTurnNotAdmittedError } from '../queue/agent-turn-runner';
import { QueuedTurnRunner } from '../queue/queued-turn-runner';
import { fakeStreamChannel } from './test-utils/stream-channel';
import { fakeRequests, testTurns } from './test-utils/turns';

const webhook: AgentWebhookRespondRequest = {
	kind: 'webhook-respond',
	agentId: 'agent-1',
	input: 'Hi',
	approvalBaseUrl: 'https://n8n.example.com/agent-webhook/agent-1',
};

function setup(
	options: { queueFull?: boolean; queueMaxWaitSeconds?: number; turnQueue?: AgentTurnQueue } = {},
) {
	const placement = mock<AgentTurnPlacement>({
		dispatchEnabled: true,
		workersAvailable: async () => true,
		queueFull: async () => options.queueFull ?? false,
		retryAfterSeconds: async () => 12,
	});
	const gate = mock<AgentTurnGate>();
	const { requests, rows } = fakeRequests();
	const fake = fakeStreamChannel();
	const turns = testTurns({
		placement,
		gate,
		requests,
		channel: fake.channel,
		turnQueue: options.turnQueue,
		agentsConfig: mock<AgentsConfig>({ queueMaxWaitSeconds: options.queueMaxWaitSeconds ?? 0 }),
	});
	return { ...turns, requests, rows, gate, ...fake };
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

		await queued.start({ turnId: 'turn-1', payload: { kind: 'app-chat' } as never });
		await ended;

		expect(entries.map((entry) => entry.sequence)).toEqual([1, 2, 3]);
		expect(entries.at(-1)).toEqual({ sequence: 3, end: { outcome: 'done' } });
		await queued.whenIdle();
		expect(rows.size).toBe(0);
		// The main stops reading the channel of a turn that ended.
		await vi.waitFor(() => expect(listening()).toEqual([]));
	});

	it('rejects a turn at once when the agent queue is full', async () => {
		const { queued, requests } = setup({ queueFull: true });

		await expect(queued.start({ turnId: 'turn-1', payload: webhook })).rejects.toEqual(
			new AgentTurnNotAdmittedError('queue-full', 12),
		);
		expect(requests.createPending).not.toHaveBeenCalled();
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
		const { queued, handlers, rows, gate } = setup({ turnQueue, queueMaxWaitSeconds: 5 });
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

		// A worker that takes the job late finds no row.
		await queued.runJob('turn-1');
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

		expect(entries).toEqual([{ sequence: 0, end: { outcome: 'lost' } }]);
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
		const { queued, handlers } = setup();
		await queued.startWorker();
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
	});

	it('rejects the turn when the job cannot be sent, and removes the row', async () => {
		const turnQueue = mock<AgentTurnQueue>();
		turnQueue.enqueueRequest.mockRejectedValue(new Error('Redis unavailable'));
		const { queued, rows, listening } = setup({ turnQueue });

		await expect(queued.start({ turnId: 'turn-1', payload: webhook })).rejects.toMatchObject({
			reason: 'queue-full',
		});
		expect(rows.size).toBe(0);
		expect(listening()).toEqual([]);
	});

	it('removes stale rows', () => {
		const { queued, requests } = setup();
		queued.removeStaleRequests();
		expect(requests.removeOlderThan).toHaveBeenCalledWith(expect.any(Date));
	});
});
