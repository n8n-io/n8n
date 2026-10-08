import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { ExperienceMode } from '@n8n/api-types';
import {
	createExperienceModeSaver,
	limitExperienceToAssistant,
	oppositeExperienceMode,
	resolveExperienceMode,
} from '../experienceMode';

const modeArb = fc.constantFrom<ExperienceMode>('simple', 'power');
// Valid modes, near misses and values of other types, as the server could send them.
const storedValueArb = fc.oneof(
	modeArb,
	fc.constantFrom('', 'Simple', 'POWER', 'builder', ' simple'),
	fc.anything(),
);

describe('resolveExperienceMode', () => {
	it('returns Power when the flag is off, whatever is saved', () => {
		fc.assert(
			fc.property(storedValueArb, storedValueArb, (saved, defaultMode) => {
				expect(resolveExperienceMode({ enabled: false, saved, defaultMode })).toBe('power');
			}),
		);
	});

	it.each<[ExperienceMode, ExperienceMode]>([
		['simple', 'power'],
		['power', 'simple'],
	])('returns the saved mode %s over the instance default %s', (saved, defaultMode) => {
		expect(resolveExperienceMode({ enabled: true, saved, defaultMode })).toBe(saved);
	});

	it.each([undefined, null, '', 'builder', 'Simple', 1, true, {}, ['simple']])(
		'uses the instance default when the saved value is %j',
		(saved) => {
			expect(resolveExperienceMode({ enabled: true, saved, defaultMode: 'simple' })).toBe('simple');
			expect(resolveExperienceMode({ enabled: true, saved, defaultMode: 'power' })).toBe('power');
		},
	);

	it.each([undefined, null, '', 'builder', 'SIMPLE', 0])(
		'returns Power when the saved value and the default %j are not valid',
		(defaultMode) => {
			expect(resolveExperienceMode({ enabled: true, saved: 'nope', defaultMode })).toBe('power');
		},
	);

	it('always returns simple or power', () => {
		fc.assert(
			fc.property(fc.boolean(), storedValueArb, storedValueArb, (enabled, saved, defaultMode) => {
				expect(['simple', 'power']).toContain(
					resolveExperienceMode({ enabled, saved, defaultMode }),
				);
			}),
		);
	});

	it('returns any valid saved mode while the flag is on', () => {
		fc.assert(
			fc.property(modeArb, storedValueArb, (saved, defaultMode) => {
				expect(resolveExperienceMode({ enabled: true, saved, defaultMode })).toBe(saved);
			}),
		);
	});
});

describe('oppositeExperienceMode', () => {
	it.each<[ExperienceMode, ExperienceMode]>([
		['simple', 'power'],
		['power', 'simple'],
	])('turns %s into %s', (mode, opposite) => {
		expect(oppositeExperienceMode(mode)).toBe(opposite);
	});
});

describe('limitExperienceToAssistant', () => {
	it('keeps experience modes on while the Assistant is on', () => {
		expect(limitExperienceToAssistant({ enabled: true, defaultMode: 'simple' }, true)).toEqual({
			enabled: true,
			defaultMode: 'simple',
		});
	});

	it('turns experience modes off when the Assistant is off, and keeps the default mode', () => {
		expect(limitExperienceToAssistant({ enabled: true, defaultMode: 'simple' }, false)).toEqual({
			enabled: false,
			defaultMode: 'simple',
		});
	});

	it('does not turn on experience modes that the instance has off', () => {
		expect(limitExperienceToAssistant({ enabled: false, defaultMode: 'power' }, true)).toEqual({
			enabled: false,
			defaultMode: 'power',
		});
	});

	it.each([true, false])(
		'stays absent when the server sent no experience settings (Assistant on: %s)',
		(assistantEnabled) => {
			expect(limitExperienceToAssistant(undefined, assistantEnabled)).toBeUndefined();
		},
	);

	it('is on only when both the instance and the Assistant are on, and does not change its input', () => {
		fc.assert(
			fc.property(fc.boolean(), modeArb, fc.boolean(), (enabled, defaultMode, assistantEnabled) => {
				const experience = { enabled, defaultMode };

				const result = limitExperienceToAssistant(experience, assistantEnabled);

				expect(result).toEqual({ enabled: enabled && assistantEnabled, defaultMode });
				expect(result).not.toBe(experience);
				expect(experience).toEqual({ enabled, defaultMode });
			}),
		);
	});
});

/** A server that answers each save only when the test says so. */
function createFakeServer() {
	const saves: ExperienceMode[] = [];
	const replies: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
	let running = 0;
	let maxRunning = 0;

	async function save(mode: ExperienceMode) {
		saves.push(mode);
		running++;
		maxRunning = Math.max(maxRunning, running);
		try {
			await new Promise<void>((resolve, reject) => replies.push({ resolve, reject }));
		} finally {
			running--;
		}
	}

	async function answer(outcome: 'ok' | Error) {
		const reply = replies.shift();
		if (!reply) throw new Error('No save is waiting for an answer');
		if (outcome === 'ok') reply.resolve();
		else reply.reject(outcome);
		await settle();
	}

	return { save, answer, saves, maxRunning: () => maxRunning, waiting: () => replies.length };
}

async function settle() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function createSaver() {
	const pending: Array<ExperienceMode | null> = [];
	const saver = createExperienceModeSaver((mode) => pending.push(mode));
	return { saver, pending };
}

describe('createExperienceModeSaver', () => {
	it('saves one request and reports that the server saved it', async () => {
		const server = createFakeServer();
		const { saver, pending } = createSaver();

		const result = saver.request('power', server.save);
		expect(server.saves).toEqual(['power']);
		expect(pending).toEqual(['power']);

		await server.answer('ok');

		await expect(result).resolves.toBe(true);
		expect(pending).toEqual(['power', null]);
	});

	it('sends only the latest mode after the running save returns', async () => {
		const server = createFakeServer();
		const { saver, pending } = createSaver();

		const results = [
			saver.request('power', server.save),
			saver.request('simple', server.save),
			saver.request('power', server.save),
			saver.request('simple', server.save),
		];
		expect(server.saves).toEqual(['power']);

		await server.answer('ok');
		expect(server.saves).toEqual(['power', 'simple']);
		expect(pending.at(-1)).toBe('simple');

		await server.answer('ok');

		expect(await Promise.all(results)).toEqual([false, false, false, true]);
		expect(server.maxRunning()).toBe(1);
		expect(pending).toEqual(['power', 'simple', 'power', 'simple', null]);
	});

	it('sends no second save when the latest mode is the one already sent', async () => {
		const server = createFakeServer();
		const { saver } = createSaver();

		const results = [
			saver.request('power', server.save),
			saver.request('simple', server.save),
			saver.request('power', server.save),
		];
		await server.answer('ok');

		expect(await Promise.all(results)).toEqual([false, false, true]);
		expect(server.saves).toEqual(['power']);
		expect(server.waiting()).toBe(0);
	});

	it('stops after a failed save, drops the queued mode and reports false to every caller', async () => {
		const server = createFakeServer();
		const { saver, pending } = createSaver();

		const results = [saver.request('power', server.save), saver.request('simple', server.save)];
		await server.answer(new Error('Request failed'));

		expect(await Promise.all(results)).toEqual([false, false]);
		expect(server.saves).toEqual(['power']);
		expect(pending.at(-1)).toBeNull();
	});

	it('reports false when the queued save fails after the first one succeeded', async () => {
		const server = createFakeServer();
		const { saver, pending } = createSaver();

		const results = [saver.request('power', server.save), saver.request('simple', server.save)];
		await server.answer('ok');
		await server.answer(new Error('Request failed'));

		expect(await Promise.all(results)).toEqual([false, false]);
		expect(server.saves).toEqual(['power', 'simple']);
		expect(pending.at(-1)).toBeNull();
	});

	it('starts a new queue after the previous one ended, also after a failure', async () => {
		const server = createFakeServer();
		const { saver } = createSaver();

		const failed = saver.request('power', server.save);
		await server.answer(new Error('Request failed'));
		await expect(failed).resolves.toBe(false);

		const first = saver.request('power', server.save);
		await server.answer('ok');
		await expect(first).resolves.toBe(true);

		const second = saver.request('simple', server.save);
		expect(server.saves).toEqual(['power', 'power', 'simple']);
		await server.answer('ok');
		await expect(second).resolves.toBe(true);
	});

	it('for any burst of changes: one save at a time, at most two saves, ending on the last choice', async () => {
		await fc.assert(
			fc.asyncProperty(fc.array(modeArb, { minLength: 1, maxLength: 8 }), async (modes) => {
				const server = createFakeServer();
				const { saver } = createSaver();

				const results = modes.map(async (mode) => await saver.request(mode, server.save));
				while (server.waiting() > 0) await server.answer('ok');
				const outcomes = await Promise.all(results);

				const last = modes[modes.length - 1];
				expect(server.saves.length).toBeLessThanOrEqual(2);
				expect(server.saves.at(-1)).toBe(last);
				expect(server.maxRunning()).toBe(1);
				// Only the last request confirms, so a caller shows one success message at most.
				expect(outcomes).toEqual(modes.map((_, index) => index === modes.length - 1));
			}),
		);
	});
});
