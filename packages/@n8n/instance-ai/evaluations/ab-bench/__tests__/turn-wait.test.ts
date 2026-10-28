import { describe, expect, it } from 'vitest';

import type { CapturedEvent } from '../../types';
import { waitForNextRunStart } from '../turn-wait';

function event(type: string): CapturedEvent {
	return { timestamp: Date.now(), type, data: { type } };
}

describe('waitForNextRunStart', () => {
	it('waits until a run starts after the turn was sent', async () => {
		const events = [event('run-start'), event('run-finish')];
		const startsBefore = 1;
		setTimeout(() => events.push(event('run-start')), 30);

		await waitForNextRunStart(events, startsBefore, { timeoutMs: 1_000, pollMs: 5 });

		expect(events.filter((e) => e.type === 'run-start')).toHaveLength(2);
	});

	it('returns at once when the run has already started', async () => {
		const events = [event('run-start'), event('run-finish'), event('run-start')];

		await expect(
			waitForNextRunStart(events, 1, { timeoutMs: 1_000, pollMs: 5 }),
		).resolves.toBeUndefined();
	});

	it('fails when no run starts in time', async () => {
		const events = [event('run-start'), event('run-finish')];

		await expect(waitForNextRunStart(events, 1, { timeoutMs: 30, pollMs: 5 })).rejects.toThrow(
			'No run started',
		);
	});

	it('runs onTimeout before it fails, so the caller can cancel the sent run', async () => {
		const events = [event('run-start'), event('run-finish')];
		const calls: string[] = [];

		await expect(
			waitForNextRunStart(events, 1, {
				timeoutMs: 30,
				pollMs: 5,
				onTimeout: async () => {
					calls.push('cancel');
				},
			}),
		).rejects.toThrow('No run started');
		expect(calls).toEqual(['cancel']);
	});

	it('does not run onTimeout when the run starts', async () => {
		const events = [event('run-start'), event('run-finish'), event('run-start')];
		const calls: string[] = [];

		await waitForNextRunStart(events, 1, {
			timeoutMs: 1_000,
			pollMs: 5,
			onTimeout: async () => {
				calls.push('cancel');
			},
		});
		expect(calls).toEqual([]);
	});
});
