import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { effectScope, nextTick, reactive, type EffectScope } from 'vue';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { hasNewKey, settledActivityKeys, useChatTurnEnded } from '../useChatTurnEnded';
import { chat, T0, T1 } from './navigationFixtures';

const { store } = vi.hoisted(() => ({
	store: { threads: [] as InstanceAiThreadSummary[] },
}));

const reactiveStore = reactive(store);

vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => reactiveStore,
}));

const T2 = '2026-03-01T12:00:00.000Z';

let scopes: EffectScope[] = [];

function mount() {
	const onEnded = vi.fn();
	const scope = effectScope();
	scopes.push(scope);
	scope.run(() => useChatTurnEnded(onEnded));
	return onEnded;
}

async function setThreads(threads: InstanceAiThreadSummary[]) {
	reactiveStore.threads = threads;
	await nextTick();
}

describe('settledActivityKeys', () => {
	it('keys each chat that is not working by its ID and last activity', () => {
		const keys = settledActivityKeys([
			chat('idle', 'Idle', { state: 'idle', lastActivityAt: T1 }),
			chat('busy', 'Busy', { state: 'working', lastActivityAt: T1 }),
			chat('waiting', 'Waiting', { state: 'needs-you', lastActivityAt: T2 }),
			chat('older', 'Older', { updatedAt: T0 }),
		]);

		expect([...keys]).toEqual([`idle@${T1}`, `waiting@${T2}`, `older@${T0}`]);
	});
});

describe('hasNewKey', () => {
	it('is true only for a key that the previous set does not have', () => {
		expect(hasNewKey(new Set(['a']), new Set(['a', 'b']))).toBe(true);
		expect(hasNewKey(new Set(['a', 'b']), new Set(['a']))).toBe(false);
		expect(hasNewKey(new Set(['a']), new Set(['a']))).toBe(false);
		expect(hasNewKey(new Set(), new Set())).toBe(false);
		expect(hasNewKey(new Set(), new Set(['a']))).toBe(true);
	});

	it('is false for every subset, and true when a key is added', () => {
		fc.assert(
			fc.property(fc.uniqueArray(fc.string(), { maxLength: 10 }), fc.string(), (keys, extra) => {
				const all = new Set(keys);
				const subset = new Set(keys.filter((_, index) => index % 2 === 0));
				expect(hasNewKey(all, subset)).toBe(false);
				expect(hasNewKey(all, new Set([...keys, extra]))).toBe(!all.has(extra));
			}),
		);
	});
});

describe('useChatTurnEnded', () => {
	beforeEach(() => {
		reactiveStore.threads = [];
	});

	afterEach(() => {
		for (const scope of scopes) scope.stop();
		scopes = [];
	});

	it('calls nothing for the first load of the list', async () => {
		const onEnded = mount();

		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T0 })]);

		expect(onEnded).not.toHaveBeenCalled();
	});

	it('calls nothing for the first load after an empty list', async () => {
		const onEnded = mount();

		await setThreads([]);
		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T0 })]);

		expect(onEnded).not.toHaveBeenCalled();
	});

	it('calls when the first chat of a user ends its first turn', async () => {
		const onEnded = mount();

		// A new chat shows at once, before the server knows its state.
		await setThreads([chat('a', 'A')]);
		await setThreads([chat('a', 'A', { state: 'working', lastActivityAt: T1 })]);
		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T2 })]);

		expect(onEnded).toHaveBeenCalledTimes(1);
	});

	it('calls once when a chat stops working', async () => {
		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T0 })]);
		const onEnded = mount();

		await setThreads([chat('a', 'A', { state: 'working', lastActivityAt: T1 })]);
		expect(onEnded).not.toHaveBeenCalled();

		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T2 })]);
		expect(onEnded).toHaveBeenCalledTimes(1);
	});

	it('calls when a chat has new activity that the list never showed as working', async () => {
		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T0 })]);
		const onEnded = mount();

		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T1 })]);

		expect(onEnded).toHaveBeenCalledTimes(1);
	});

	it('calls when a chat stops to wait for an answer on a card', async () => {
		await setThreads([chat('a', 'A', { state: 'working', lastActivityAt: T0 })]);
		await setThreads([
			chat('a', 'A', { state: 'working', lastActivityAt: T0 }),
			chat('b', 'B', { state: 'idle', lastActivityAt: T0 }),
		]);
		const onEnded = mount();

		await setThreads([
			chat('a', 'A', { state: 'needs-you', needsInput: true, lastActivityAt: T1 }),
			chat('b', 'B', { state: 'idle', lastActivityAt: T0 }),
		]);

		expect(onEnded).toHaveBeenCalledTimes(1);
	});

	it('calls nothing while chats keep working, are removed or keep their activity', async () => {
		await setThreads([
			chat('a', 'A', { state: 'working', lastActivityAt: T0 }),
			chat('b', 'B', { state: 'idle', lastActivityAt: T0 }),
			chat('c', 'C', { state: 'idle', lastActivityAt: T0 }),
		]);
		const onEnded = mount();

		await setThreads([
			chat('a', 'A', { state: 'working', lastActivityAt: T1 }),
			chat('b', 'Renamed', { state: 'idle', lastActivityAt: T0 }),
		]);

		expect(onEnded).not.toHaveBeenCalled();
	});

	it('calls when a new chat appears in the list', async () => {
		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T0 })]);
		const onEnded = mount();

		await setThreads([
			chat('new', 'New', { state: 'idle', lastActivityAt: T1 }),
			chat('a', 'A', { state: 'idle', lastActivityAt: T0 }),
		]);

		expect(onEnded).toHaveBeenCalledTimes(1);
	});

	it('stops calling after unmount', async () => {
		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T0 })]);
		const onEnded = mount();
		for (const scope of scopes) scope.stop();

		await setThreads([chat('a', 'A', { state: 'idle', lastActivityAt: T1 })]);

		expect(onEnded).not.toHaveBeenCalled();
	});
});
