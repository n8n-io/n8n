import { useAquariumStore } from './aquarium.store';
import { DEMO_ENTITIES } from './sources/demo.source';
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
});
