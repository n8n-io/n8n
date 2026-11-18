import { useAquariumStore } from './aquarium.store';
import { DEMO_ENTITIES } from './sources/demo.source';
import * as activitySource from './sources/activity.source';
import * as sourceUtils from './sources/source.utils';

describe('useAquariumStore', () => {
	it('loads the demo entities without a request', async () => {
		const store = useAquariumStore();

		await store.load({ demo: true });

		expect(store.entities).toEqual(DEMO_ENTITIES);
		expect(store.failedSources).toEqual([]);
		expect(store.hasLoaded).toBe(true);
		expect(store.isLoading).toBe(false);
	});

	it('is partial only when every metrics source fails', async () => {
		const spy = vi.spyOn(sourceUtils, 'loadFromSources');
		const store = useAquariumStore();

		spy.mockResolvedValueOnce({ entities: [], failedSources: ['insights'] });
		await store.load();
		expect(store.isPartial).toBe(false);

		spy.mockResolvedValueOnce({ entities: [], failedSources: ['executions', 'insights'] });
		await store.load();
		expect(store.isPartial).toBe(true);
	});

	describe('live updates', () => {
		const snapshot = {
			windowSeconds: 60,
			byKey: new Map([
				[
					'workflow:1',
					{
						running: 1,
						started: 2,
						succeeded: 1,
						failed: 0,
						startedPerSecond: [1, 1],
						lastEventAt: 0,
					},
				],
			]),
		};

		afterEach(() => {
			vi.useRealTimers();
		});

		it('polls the activity until stopped', async () => {
			vi.useFakeTimers();
			const fetch = vi.spyOn(activitySource, 'fetchActivity').mockResolvedValue(snapshot);
			const store = useAquariumStore();

			store.startLiveUpdates();
			await vi.advanceTimersByTimeAsync(0);
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(store.activity).toBe(snapshot);

			await vi.advanceTimersByTimeAsync(2_000);
			expect(fetch).toHaveBeenCalledTimes(2);

			store.stopLiveUpdates();
			await vi.advanceTimersByTimeAsync(10_000);
			expect(fetch).toHaveBeenCalledTimes(2);
			expect(store.activity.byKey.size).toBe(0);
		});

		it('keeps the last activity when a poll fails', async () => {
			const fetch = vi.spyOn(activitySource, 'fetchActivity').mockResolvedValueOnce(snapshot);
			const store = useAquariumStore();
			await store.refreshActivity();

			fetch.mockRejectedValueOnce(new Error('offline'));
			await store.refreshActivity();

			expect(store.activity).toBe(snapshot);
			expect(store.hasActivityError).toBe(true);
		});

		it('makes up activity in demo mode without a request', async () => {
			const fetch = vi.spyOn(activitySource, 'fetchActivity');
			const store = useAquariumStore();
			await store.load({ demo: true });

			await store.refreshActivity({ demo: true });

			expect(fetch).not.toHaveBeenCalled();
			expect(store.activity.windowSeconds).toBe(60);
		});
	});

	describe('data set', () => {
		const dataset = {
			source: 'example.app.n8n.cloud',
			totalEntities: 1,
			windowSeconds: 3600,
			entities: [
				{
					key: 'workflow:x',
					id: 'x',
					kind: 'workflow' as const,
					name: 'From file',
					metrics: { complexity: 2, executionCount: 3600, failedCount: 0, averageRunTimeMs: 1000 },
				},
			],
		};

		it('replaces live and demo entities, and sends no request', async () => {
			const load = vi.spyOn(sourceUtils, 'loadFromSources');
			const fetch = vi.spyOn(activitySource, 'fetchActivity');
			const store = useAquariumStore();

			store.setDataset(dataset);
			await store.load({ demo: true });
			await store.refreshActivity();

			expect(store.entities).toBe(dataset.entities);
			expect(store.activity.byKey.has('workflow:x')).toBe(true);
			expect(load).not.toHaveBeenCalled();
			expect(fetch).not.toHaveBeenCalled();
		});

		it('is not overwritten by a slower live load that started before it', async () => {
			let finishLiveLoad: (value: sourceUtils.LoadResult) => void = () => {};
			vi.spyOn(sourceUtils, 'loadFromSources').mockReturnValueOnce(
				new Promise((resolve) => {
					finishLiveLoad = resolve;
				}),
			);
			const store = useAquariumStore();

			const liveLoad = store.load();
			store.setDataset(dataset);
			await store.load();
			finishLiveLoad({ entities: DEMO_ENTITIES, failedSources: [] });
			await liveLoad;

			expect(store.entities).toBe(dataset.entities);
			expect(store.isLoading).toBe(false);
		});

		it('goes back to the demo entities when cleared', async () => {
			const store = useAquariumStore();
			store.setDataset(dataset);
			await store.load({ demo: true });

			store.setDataset(undefined);
			await store.load({ demo: true });

			expect(store.entities).toEqual(DEMO_ENTITIES);
		});
	});
});
