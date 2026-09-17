import { vi, describe, it, expect, beforeEach } from 'vitest';
import { invalidatePromotionConnection, usePromotionConnection } from './usePromotionConnection';
import * as api from '../promotionsSettings.api';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: {} }),
}));

vi.mock('../promotionsSettings.api');

const connection = {
	id: 'connection-1',
	scope: 'instance',
	configs: { apply: { id: 'config-1' } },
} as unknown as api.PromotionConnection;

describe('usePromotionConnection', () => {
	beforeEach(() => {
		vi.mocked(api.fetchPromotionConnections).mockReset();
		invalidatePromotionConnection();
	});

	it('should fetch the instance connection once for every caller', async () => {
		vi.mocked(api.fetchPromotionConnections).mockResolvedValue([connection]);
		const header = usePromotionConnection();
		const modal = usePromotionConnection();

		await Promise.all([header.load(), modal.load()]);

		expect(api.fetchPromotionConnections).toHaveBeenCalledTimes(1);
		expect(api.fetchPromotionConnections).toHaveBeenCalledWith({}, { scope: 'instance' });
		expect(modal.connection.value).toEqual(connection);
		expect(header.hasApplyConfig.value).toBe(true);
		expect(header.hasPromoteConfig.value).toBe(false);
	});

	it('should treat a failed lookup as no connection and retry on the next load', async () => {
		vi.mocked(api.fetchPromotionConnections)
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce([connection]);
		const { connection: current, load } = usePromotionConnection();

		await load();
		expect(current.value).toBeNull();

		await load();
		expect(current.value).toEqual(connection);
		expect(api.fetchPromotionConnections).toHaveBeenCalledTimes(2);
	});

	it('should fetch again only after the cache is invalidated', async () => {
		vi.mocked(api.fetchPromotionConnections).mockResolvedValue([connection]);
		const { load } = usePromotionConnection();

		await load();
		await load();
		expect(api.fetchPromotionConnections).toHaveBeenCalledTimes(1);

		invalidatePromotionConnection();
		await load();
		expect(api.fetchPromotionConnections).toHaveBeenCalledTimes(2);
	});
});
