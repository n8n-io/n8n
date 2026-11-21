import type { AgentsConfig } from '@n8n/config';

import type { AgentMainMemory } from '../queue/agent-main-memory.service';
import { AgentQueueMetrics, type AgentQueueMetricEvent } from '../queue/agent-queue-metrics';
import { AgentTurnGate, requestTurnClass, TURN_PRIORITY } from '../queue/agent-turn-gate.service';

function setup({
	mainMaxTurns = 20,
	mainMaxIntake = 0,
	mainMaxStreams = 0,
	queueMaxWaiting = 0,
	queueMaxWaitSeconds = 60,
	memoryHigh = false,
	localTurns = 0,
}: {
	mainMaxTurns?: number;
	mainMaxIntake?: number;
	mainMaxStreams?: number;
	queueMaxWaiting?: number;
	queueMaxWaitSeconds?: number;
	memoryHigh?: boolean;
	localTurns?: number;
} = {}) {
	const config = {
		mainMaxTurns,
		mainMaxIntake,
		mainMaxStreams,
		queueMaxWaiting,
		queueMaxWaitSeconds,
	} as AgentsConfig;
	const metrics = new AgentQueueMetrics();
	const running = { turns: localTurns };
	metrics.registerGauges({ localTurns: () => running.turns });
	const events: AgentQueueMetricEvent[] = [];
	metrics.onEvent((event) => events.push(event));
	const memory = { high: memoryHigh };
	const gate = new AgentTurnGate(config, metrics, {
		isHigh: () => memory.high,
	} as AgentMainMemory);
	/** A taken turn starts and ends again, so it no longer counts. */
	const turnStartedAndEnded = () => metrics.record({ type: 'turn-started', location: 'main' });
	return { gate, events, running, memory, turnStartedAndEnded };
}

const signal = () => new AbortController().signal;

describe('AgentTurnGate', () => {
	afterEach(() => vi.useRealTimers());

	describe('waitForRoom', () => {
		it('admits a turn at once when this process has room', async () => {
			const { gate } = setup();
			expect(await gate.waitForRoom('chat')).toEqual({ admitted: true });
			expect(gate.turnsHere()).toBe(1);
		});

		it('admits a nested turn even at the limit, so a parent cannot deadlock', async () => {
			const { gate } = setup({ mainMaxTurns: 1, localTurns: 1 });
			expect(await gate.waitForRoom('nested')).toEqual({ admitted: true });
		});

		it('lets a waiting turn in when a running turn ends', async () => {
			vi.useFakeTimers();
			const { gate, running } = setup({ mainMaxTurns: 1, localTurns: 1 });
			const waiting = gate.waitForRoom('chat');
			running.turns = 0;
			await vi.advanceTimersByTimeAsync(AgentTurnGate.RECHECK_MS);
			expect(await waiting).toEqual({ admitted: true });
		});

		it('starts waiting turns in priority order', async () => {
			vi.useFakeTimers();
			const { gate, running, turnStartedAndEnded } = setup({ mainMaxTurns: 1, localTurns: 1 });
			const order: string[] = [];
			const background = gate.waitForRoom('background').then(() => order.push('background'));
			const chat = gate.waitForRoom('chat').then(() => order.push('chat'));
			const resume = gate.waitForRoom('resume').then(() => order.push('resume'));

			running.turns = 0;
			await vi.advanceTimersByTimeAsync(AgentTurnGate.RECHECK_MS);
			expect(order).toEqual(['resume']);

			turnStartedAndEnded();
			await vi.advanceTimersByTimeAsync(AgentTurnGate.RECHECK_MS);
			expect(order).toEqual(['resume', 'chat']);

			turnStartedAndEnded();
			await vi.advanceTimersByTimeAsync(AgentTurnGate.RECHECK_MS);
			await Promise.all([background, chat, resume]);
			expect(order).toEqual(['resume', 'chat', 'background']);
		});

		it('rejects a turn that waits longer than the wait limit', async () => {
			vi.useFakeTimers();
			const { gate, events } = setup({ mainMaxTurns: 1, localTurns: 1, queueMaxWaitSeconds: 2 });
			const waiting = gate.waitForRoom('chat');
			await vi.advanceTimersByTimeAsync(2_000 + AgentTurnGate.RECHECK_MS);
			expect(await waiting).toMatchObject({ admitted: false, reason: 'wait-too-long' });
			expect(events).toContainEqual({ type: 'turn-rejected', reason: 'wait-too-long' });
		});

		it('tells low memory apart from a busy main when it rejects', async () => {
			vi.useFakeTimers();
			const { gate } = setup({ localTurns: 1, memoryHigh: true, queueMaxWaitSeconds: 1 });
			const waiting = gate.waitForRoom('chat');
			await vi.advanceTimersByTimeAsync(1_000 + AgentTurnGate.RECHECK_MS);
			expect(await waiting).toMatchObject({ admitted: false, reason: 'main-memory-high' });
		});

		it('rejects a new turn at once when too many turns wait', async () => {
			const { gate, events } = setup({ mainMaxTurns: 1, localTurns: 1, queueMaxWaiting: 1 });
			void gate.waitForRoom('chat');
			const rejected = await gate.waitForRoom('chat');
			expect(rejected).toMatchObject({ admitted: false, reason: 'queue-full' });
			expect(events).toContainEqual({ type: 'turn-rejected', reason: 'queue-full' });
		});

		it('waits with no limit for work that must not be lost', async () => {
			vi.useFakeTimers();
			const { gate, running } = setup({
				mainMaxTurns: 1,
				localTurns: 1,
				queueMaxWaiting: 1,
				queueMaxWaitSeconds: 1,
			});
			void gate.waitForRoom('chat');
			const resume = gate.waitForRoom('resume', { untilRoom: true });
			await vi.advanceTimersByTimeAsync(10_000);
			running.turns = 0;
			await vi.advanceTimersByTimeAsync(AgentTurnGate.RECHECK_MS);
			expect(await resume).toEqual({ admitted: true });
		});

		it('drops a waiting turn when its caller leaves', async () => {
			const { gate, events } = setup({ mainMaxTurns: 1, localTurns: 1 });
			const controller = new AbortController();
			const waiting = gate.waitForRoom('chat', { abortSignal: controller.signal });
			controller.abort();
			expect(await waiting).toMatchObject({ admitted: false, reason: 'left' });
			expect(gate.waiting()).toBe(0);
			expect(events.filter((event) => event.type === 'turn-rejected')).toEqual([]);
		});
	});

	describe('mayStartQueued', () => {
		it('counts turns that have not started yet toward the turn limit', () => {
			vi.useFakeTimers();
			const { gate } = setup({ mainMaxTurns: 2 });
			const queuedAt = Date.now();
			expect([1, 2, 3].map(() => gate.mayStartQueued(queuedAt))).toEqual([true, true, false]);
			vi.advanceTimersByTime(AgentTurnGate.CLAIM_START_MS);
			expect(gate.mayStartQueued(queuedAt)).toBe(true);
		});

		it('counts a claimed turn once when it starts to run', () => {
			const { gate, running, turnStartedAndEnded } = setup({ mainMaxTurns: 2 });
			expect(gate.mayStartQueued(Date.now())).toBe(true);
			expect(gate.turnsHere()).toBe(1);
			// The turn shows as running, and its claim stops counting.
			running.turns = 1;
			turnStartedAndEnded();
			expect(gate.turnsHere()).toBe(1);
			expect(gate.mayStartQueued(Date.now())).toBe(true);
			expect(gate.mayStartQueued(Date.now())).toBe(false);
		});

		it('counts a turn that waitForRoom admitted once when it starts to run', async () => {
			const { gate, running, turnStartedAndEnded } = setup({ mainMaxTurns: 2 });
			await gate.waitForRoom('channel');
			running.turns = 1;
			turnStartedAndEnded();
			expect(gate.turnsHere()).toBe(1);
		});

		it('lets a held message go before a newer message when room frees up', () => {
			vi.useFakeTimers();
			const { gate, turnStartedAndEnded } = setup({ mainMaxTurns: 1 });
			const older = Date.now() - 2_000;
			const newer = Date.now() - 1_000;
			expect(gate.mayStartQueued(Date.now())).toBe(true);
			expect(gate.mayStartQueued(older)).toBe(false);
			expect(gate.hasHeldTurns).toBe(true);

			turnStartedAndEnded();
			expect(gate.mayStartQueued(newer)).toBe(false);
			expect(gate.mayStartQueued(older)).toBe(true);

			// A held message that nobody checks again, for example a cancelled one, loses its place.
			turnStartedAndEnded();
			vi.advanceTimersByTime(AgentTurnGate.HELD_TTL_MS);
			expect(gate.hasHeldTurns).toBe(false);
			expect(gate.mayStartQueued(Date.now())).toBe(true);
		});

		it('holds a message while memory is high, but always runs one turn', () => {
			const busy = setup({ memoryHigh: true, localTurns: 1 });
			expect(busy.gate.mayStartQueued(Date.now())).toBe(false);
			expect(busy.events).toEqual([{ type: 'turn-held', reason: 'main-memory-high' }]);

			const idle = setup({ memoryHigh: true });
			expect(idle.gate.mayStartQueued(Date.now())).toBe(true);
			expect(idle.gate.mayStartQueued(Date.now())).toBe(false);
		});

		it('lets turns with an open request go before queued messages', () => {
			const { gate } = setup({ mainMaxTurns: 1, localTurns: 1 });
			void gate.waitForRoom('chat');
			expect(gate.mayStartQueued(Date.now())).toBe(false);
		});
	});

	describe('openStream', () => {
		it('opens no live stream while memory is high', () => {
			expect(setup().gate.openStream()).toBeDefined();
			const { gate, events } = setup({ memoryHigh: true });
			expect(gate.openStream()).toBeUndefined();
			expect(events).toEqual([{ type: 'stream-skipped', reason: 'main-memory-high' }]);
		});

		it('opens no more live streams than the limit, and frees a place when one closes', () => {
			const { gate, events } = setup({ mainMaxStreams: 2 });
			const first = gate.openStream();
			expect(gate.openStream()).toBeDefined();
			expect(gate.openStream()).toBeUndefined();
			expect(events).toEqual([{ type: 'stream-skipped', reason: 'main-at-stream-limit' }]);

			first?.();
			first?.();
			expect(gate.openStream()).toBeDefined();
			expect(gate.openStream()).toBeUndefined();
		});
	});

	describe('enterIntake', () => {
		it('applies no limit with a limit of 0', async () => {
			const { gate } = setup({ mainMaxIntake: 0 });
			expect(await gate.enterIntake(signal())).toBeDefined();
			expect(await gate.enterIntake(signal())).toBeDefined();
		});

		it('lets a waiting message in, in order, when a place is freed', async () => {
			const { gate } = setup({ mainMaxIntake: 1 });
			const leave = await gate.enterIntake(signal());
			const order: string[] = [];
			const second = gate.enterIntake(signal()).then((r) => {
				order.push('second');
				return r;
			});
			const third = gate.enterIntake(signal()).then((r) => {
				order.push('third');
				return r;
			});

			leave?.();
			leave?.();
			const leaveSecond = await second;
			expect(leaveSecond).toBeDefined();
			expect(order).toEqual(['second']);

			leaveSecond?.();
			expect(await third).toBeDefined();
			expect(order).toEqual(['second', 'third']);
		});

		it('rejects a message that waits too long', async () => {
			vi.useFakeTimers();
			const { gate, events } = setup({ mainMaxIntake: 1 });
			const leave = await gate.enterIntake(signal());
			const waiting = gate.enterIntake(signal());
			vi.advanceTimersByTime(AgentTurnGate.INTAKE_WAIT_MS);
			expect(await waiting).toBeUndefined();
			expect(events).toEqual([{ type: 'intake-rejected' }]);

			leave?.();
			expect(await gate.enterIntake(signal())).toBeDefined();
		});

		it('drops a waiting message when its request is aborted', async () => {
			const { gate, events } = setup({ mainMaxIntake: 1 });
			const leave = await gate.enterIntake(signal());
			const controller = new AbortController();
			const waiting = gate.enterIntake(controller.signal);
			controller.abort();
			expect(await waiting).toBeUndefined();
			expect(events).toEqual([]);

			leave?.();
			expect(await gate.enterIntake(signal())).toBeDefined();
			expect(await gate.enterIntake(controller.signal)).toBeUndefined();
		});
	});

	describe('retryAfterSeconds', () => {
		it('grows with the share of the waiting limit in use, within bounds', () => {
			const { gate } = setup({ queueMaxWaiting: 100 });
			for (let i = 0; i < 20; i++) {
				const empty = gate.retryAfterSeconds(0);
				const full = gate.retryAfterSeconds(100);
				expect(empty).toBeGreaterThanOrEqual(AgentTurnGate.MIN_RETRY_AFTER_SECONDS);
				expect(empty).toBeLessThanOrEqual(6);
				expect(full).toBeGreaterThanOrEqual(96);
				expect(full).toBeLessThanOrEqual(AgentTurnGate.MAX_RETRY_AFTER_SECONDS);
			}
		});
	});

	it('orders request kinds by urgency', () => {
		expect(TURN_PRIORITY[requestTurnClass('chat-resume')]).toBeLessThan(
			TURN_PRIORITY[requestTurnClass('app-chat')],
		);
		expect(TURN_PRIORITY[requestTurnClass('app-chat')]).toBeLessThan(
			TURN_PRIORITY[requestTurnClass('webhook-respond')],
		);
		expect(TURN_PRIORITY[requestTurnClass('webhook-respond')]).toBeLessThan(
			TURN_PRIORITY[requestTurnClass('task-run')],
		);
	});
});
