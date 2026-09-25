import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import {
	runMultiTurnConversation,
	timeoutBreach,
	waitForAllActivity,
	type WaitConfig,
} from '../harness/chat-loop';
import type { EvalLogger } from '../harness/logger';
import { MIN_TURN_BUDGET_MS, RunTimeoutError } from '../harness/timeouts';
import { USER_TURN_EVENT, type CapturedEvent } from '../types';

const logger = { verbose: () => {}, info: () => {}, warn: () => {} } as unknown as EvalLogger;

function event(type: string, timestamp: number): CapturedEvent {
	return { timestamp, type, data: { type } };
}

function userTurn(timestamp: number): CapturedEvent {
	return {
		timestamp,
		type: USER_TURN_EVENT,
		data: { type: USER_TURN_EVENT, payload: { text: 'go' } },
	};
}

function makeClient(): N8nClient & { cancelRun: ReturnType<typeof vi.fn> } {
	return {
		cancelRun: vi.fn().mockResolvedValue(undefined),
		sendMessage: vi.fn().mockResolvedValue(undefined),
		getThreadStatus: vi.fn().mockResolvedValue({ backgroundTasks: [], memoryTasks: [] }),
	} as unknown as N8nClient & { cancelRun: ReturnType<typeof vi.fn> };
}

function config(overrides: Partial<WaitConfig>): WaitConfig {
	const now = Date.now();
	return {
		client: makeClient(),
		threadId: 'thread-1',
		events: [userTurn(now), event('run-start', now)],
		approvedRequests: new Set<string>(),
		startTime: now,
		timeoutMs: 1_800_000,
		turnTimeoutMs: 900_000,
		turnStartedAt: now,
		inactivityTimeoutMs: 240_000,
		logger,
		...overrides,
	};
}

describe('timeoutBreach', () => {
	it('is quiet while every budget has room', () => {
		const now = Date.now();
		expect(timeoutBreach(config({}), now + 60_000)).toBeUndefined();
	});

	it('names the turn budget when one user turn overruns it while the conversation still has room', () => {
		const now = Date.now();
		const cfg = config({ startTime: now - 600_000, turnStartedAt: now - 900_001 });
		cfg.events.push(event('reasoning-delta', now));
		expect(timeoutBreach(cfg, now)).toEqual({ kind: 'turn', turn: 1, elapsedMs: 900_001 });
	});

	it('names the conversation budget first, even when the turn budget is also over', () => {
		const now = Date.now();
		const cfg = config({ startTime: now - 1_800_001, turnStartedAt: now - 900_001 });
		cfg.events.push(event('reasoning-delta', now));
		expect(timeoutBreach(cfg, now)?.kind).toBe('conversation');
	});

	it('names inactivity when the run in flight has emitted nothing for the bound', () => {
		const now = Date.now();
		const cfg = config({ startTime: now - 300_000, turnStartedAt: now - 300_000 });
		cfg.events.push(event('tool-input-start', now - 240_001));
		expect(timeoutBreach(cfg, now)).toEqual({ kind: 'inactivity', turn: 1, elapsedMs: 240_001 });
	});

	it('does not read a streaming run as inactive', () => {
		const now = Date.now();
		const cfg = config({ startTime: now - 300_000, turnStartedAt: now - 300_000 });
		cfg.events.push(event('reasoning-delta', now - 10_000));
		expect(timeoutBreach(cfg, now)).toBeUndefined();
	});

	it('counts the user turn the breach happened in', () => {
		const now = Date.now();
		const cfg = config({ startTime: now - 1_000_000, turnStartedAt: now - 900_001 });
		cfg.events.push(
			event('run-finish', now - 950_000),
			userTurn(now - 900_001),
			event('run-start', now - 900_000),
		);
		expect(timeoutBreach(cfg, now)?.turn).toBe(2);
	});

	it('applies only the conversation budget when no turn budget is configured', () => {
		const now = Date.now();
		const cfg = config({
			startTime: now - 1_000_000,
			turnTimeoutMs: undefined,
			turnStartedAt: undefined,
			inactivityTimeoutMs: undefined,
		});
		cfg.events.push(event('tool-input-start', now - 999_000));
		expect(timeoutBreach(cfg, now)).toBeUndefined();
	});
});

describe('waitForAllActivity under a budget', () => {
	it('cancels the run and throws a typed error when the turn budget fires', async () => {
		const now = Date.now();
		const cfg = config({ startTime: now - 600_000, turnStartedAt: now - 900_001 });
		cfg.events.push(event('reasoning-delta', now));

		await expect(waitForAllActivity(cfg)).rejects.toBeInstanceOf(RunTimeoutError);
		await expect(waitForAllActivity(cfg)).rejects.toMatchObject({
			timeout: { kind: 'turn', turn: 1 },
			message: expect.stringContaining('Run timed out after'),
		});
		expect(cfg.client.cancelRun).toHaveBeenCalledWith('thread-1');
	});

	it('cancels a silent run when the inactivity bound fires', async () => {
		const now = Date.now();
		const cfg = config({ startTime: now - 300_000, turnStartedAt: now - 300_000 });
		cfg.events.push(event('tool-input-start', now - 240_001));

		await expect(waitForAllActivity(cfg)).rejects.toMatchObject({
			timeout: { kind: 'inactivity' },
		});
		expect(cfg.client.cancelRun).toHaveBeenCalled();
	});

	it('returns normally when the run finishes inside every budget', async () => {
		const now = Date.now();
		const cfg = config({ startTime: now - 60_000, turnStartedAt: now - 60_000 });
		cfg.events.push(event('run-finish', now));

		await expect(waitForAllActivity(cfg)).resolves.toBeUndefined();
		expect(cfg.client.cancelRun).not.toHaveBeenCalled();
	});
});

describe('runMultiTurnConversation follow-up gate', () => {
	function loop(
		overrides: Partial<WaitConfig>,
		decisions: Array<{ kind: 'followUp'; message: string } | { kind: 'done' }>,
	) {
		const now = Date.now();
		const remaining = [...decisions];
		const cfg = config({
			events: [userTurn(now - 1000), event('run-start', now - 900), event('run-finish', now)],
			...overrides,
		});
		return {
			cfg,
			run: async () =>
				await runMultiTurnConversation({
					...cfg,
					nextMessageDecider: vi
						.fn()
						.mockImplementation(
							async () => await Promise.resolve(remaining.shift() ?? { kind: 'done' }),
						),
				}),
		};
	}

	it('ends the conversation as a timeout instead of starting a turn that cannot finish', async () => {
		const now = Date.now();
		const { cfg, run } = loop({ startTime: now - (1_800_000 - MIN_TURN_BUDGET_MS + 1_000) }, [
			{ kind: 'followUp', message: 'one more change' },
		]);

		await expect(run()).resolves.toMatchObject({ kind: 'conversation', turn: 2 });
		expect(cfg.client.sendMessage).not.toHaveBeenCalled();
	});

	it('sends the follow-up while a minimal turn budget is left and marks the turn start', async () => {
		const now = Date.now();
		const { cfg, run } = loop({ startTime: now - 600_000 }, [
			{ kind: 'followUp', message: 'one more change' },
			{ kind: 'done' },
		]);
		// The follow-up's run finishes at once, so the loop asks the proxy again.
		vi.mocked(cfg.client.sendMessage).mockImplementation(async () => {
			cfg.events.push(event('run-start', Date.now()), event('run-finish', Date.now()));
			return await Promise.resolve({ runId: 'run-2' });
		});

		await expect(run()).resolves.toBeUndefined();
		expect(cfg.client.sendMessage).toHaveBeenCalledTimes(1);
		expect(cfg.turnStartedAt).toBeGreaterThanOrEqual(now);
	});

	it('returns undefined when the proxy is done, whatever the budget says', async () => {
		const now = Date.now();
		const { cfg, run } = loop({ startTime: now - (1_800_000 - 10_000) }, [{ kind: 'done' }]);

		await expect(run()).resolves.toBeUndefined();
		expect(cfg.client.sendMessage).not.toHaveBeenCalled();
	});

	it('keeps the old rule with no turn budget: a follow-up goes out while any time is left', async () => {
		const now = Date.now();
		const { cfg, run } = loop(
			{
				startTime: now - 25_000,
				timeoutMs: 30_000,
				turnTimeoutMs: undefined,
				turnStartedAt: undefined,
			},
			[{ kind: 'followUp', message: 'one more change' }, { kind: 'done' }],
		);
		vi.mocked(cfg.client.sendMessage).mockImplementation(async () => {
			cfg.events.push(event('run-start', Date.now()), event('run-finish', Date.now()));
			return await Promise.resolve({ runId: 'run-2' });
		});

		await expect(run()).resolves.toBeUndefined();
		expect(cfg.client.sendMessage).toHaveBeenCalledTimes(1);
	});
});
