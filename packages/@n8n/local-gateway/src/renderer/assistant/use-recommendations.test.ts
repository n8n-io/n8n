// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetAssistantContextForTests } from './use-assistant-context';
import { RECOMMENDATIONS_DEBOUNCE_MS, useRecommendations } from './use-recommendations';
import type { DetectedContext } from '../../shared/types';

type ContextChangedCb = (contexts: DetectedContext[]) => void;

const W1: DetectedContext = { id: 'w1', kind: 'browser', app: 'AppW1' };
const W2: DetectedContext = { id: 'w2', kind: 'finder', app: 'AppW2' };
const W3: DetectedContext = { id: 'w3', kind: 'browser', app: 'AppW3' };

function stub(options: DetectedContext[]) {
	let listener: ContextChangedCb | undefined;
	const getRecommendations = vi.fn(async (body: { context?: { app?: string } }) => {
		await Promise.resolve();
		// Echo the app back so each context yields a distinguishable recommendation.
		return { recommendations: [{ title: body.context?.app ?? 'none', prompt: 'p', icon: '✨' }] };
	});
	const api = {
		getContextOptions: vi.fn(async () => await Promise.resolve(options)),
		onContextChanged: vi.fn((onChange: ContextChangedCb) => {
			listener = onChange;
			return () => {};
		}),
		getRecommendations,
	};
	(globalThis as unknown as { window: { electronAPI: typeof api } }).window = { electronAPI: api };
	return { api, getRecommendations, pushChange: (next: DetectedContext[]) => listener?.(next) };
}

describe('useRecommendations', () => {
	// Track instances so their context watchers are torn down between specs (the
	// shared context state is module-scoped). Mirrors TasksView calling stop() on
	// unmount.
	const instances: Array<ReturnType<typeof useRecommendations>> = [];
	function makeRecommendations() {
		const recs = useRecommendations();
		instances.push(recs);
		return recs;
	}

	beforeEach(() => {
		vi.useFakeTimers();
		__resetAssistantContextForTests();
	});

	afterEach(() => {
		instances.splice(0).forEach((recs) => recs.stop());
		vi.useRealTimers();
	});

	it('fetches immediately for the initial context on start', async () => {
		const { getRecommendations } = stub([W1]);
		const recs = makeRecommendations();
		await recs.start();
		await vi.advanceTimersByTimeAsync(0);

		expect(getRecommendations).toHaveBeenCalledTimes(1);
		expect(recs.recommendations.value[0].title).toBe('AppW1');
		expect(recs.loading.value).toBe(false);
		expect(recs.error.value).toBe(false);
	});

	it('debounces regeneration so rapid context switches fan in to one request', async () => {
		const { getRecommendations, pushChange } = stub([W1]);
		const recs = makeRecommendations();
		await recs.start();
		await vi.advanceTimersByTimeAsync(0); // initial w1 fetch
		expect(getRecommendations).toHaveBeenCalledTimes(1);

		// Two quick switches within the debounce window.
		pushChange([W2]);
		await vi.advanceTimersByTimeAsync(RECOMMENDATIONS_DEBOUNCE_MS - 100);
		pushChange([W3]);
		await vi.advanceTimersByTimeAsync(RECOMMENDATIONS_DEBOUNCE_MS);

		// Only the final context (w3) triggered a second request; w2 was coalesced.
		expect(getRecommendations).toHaveBeenCalledTimes(2);
		expect(getRecommendations.mock.calls[1][0].context?.app).toBe('AppW3');
		expect(recs.recommendations.value[0].title).toBe('AppW3');
	});

	it('shows the skeleton (loading) during the debounce wait', async () => {
		const { pushChange } = stub([W1]);
		const recs = makeRecommendations();
		await recs.start();
		await vi.advanceTimersByTimeAsync(0);

		pushChange([W2]);
		// Mid-debounce: loading is already true before the request fires.
		expect(recs.loading.value).toBe(true);
		await vi.advanceTimersByTimeAsync(RECOMMENDATIONS_DEBOUNCE_MS);
		expect(recs.loading.value).toBe(false);
	});

	it('serves a previously seen context from cache with no new request', async () => {
		const { getRecommendations, pushChange } = stub([W1]);
		const recs = makeRecommendations();
		await recs.start();
		await vi.advanceTimersByTimeAsync(0); // w1 (call 1)

		pushChange([W2]);
		await vi.advanceTimersByTimeAsync(RECOMMENDATIONS_DEBOUNCE_MS); // w2 (call 2)
		expect(getRecommendations).toHaveBeenCalledTimes(2);

		// Back to w1 — cached, resolves instantly with no third request.
		pushChange([W1]);
		await vi.advanceTimersByTimeAsync(0);
		expect(getRecommendations).toHaveBeenCalledTimes(2);
		expect(recs.recommendations.value[0].title).toBe('AppW1');
		expect(recs.loading.value).toBe(false);
	});

	it('falls back to error state when context detection fails', async () => {
		const getRecommendations = vi.fn();
		const api = {
			getContextOptions: vi.fn(async () => {
				await Promise.resolve();
				throw new Error('no accessibility permission');
			}),
			onContextChanged: vi.fn(() => () => {}),
			getRecommendations,
		};
		(globalThis as unknown as { window: { electronAPI: typeof api } }).window = {
			electronAPI: api,
		};

		const recs = makeRecommendations();
		await recs.start();
		await vi.advanceTimersByTimeAsync(0);

		// Detection failed → empty-state fallback, not a stuck skeleton.
		expect(recs.loading.value).toBe(false);
		expect(recs.error.value).toBe(true);
		expect(getRecommendations).not.toHaveBeenCalled();
	});

	it('sets error and clears recommendations when generation fails', async () => {
		const { getRecommendations } = stub([W1]);
		getRecommendations.mockRejectedValueOnce(new Error('model unavailable'));
		const recs = makeRecommendations();
		await recs.start();
		await vi.advanceTimersByTimeAsync(0);

		expect(recs.error.value).toBe(true);
		expect(recs.recommendations.value).toEqual([]);
		expect(recs.loading.value).toBe(false);
	});
});
