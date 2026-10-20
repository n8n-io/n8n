import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
	invalidateInstancePromotionConnection,
	useInstancePromotionConnection,
} from './useInstancePromotionConnection';
import * as api from '../promotionsSettings.api';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: {} }),
}));

vi.mock('../promotionsSettings.api');

const applyEnvironment = {
	id: 'environment-1',
	scope: 'instance',
	direction: 'apply',
} as api.PromotionEnvironmentSummary;

describe('useInstancePromotionConnection', () => {
	beforeEach(() => {
		vi.mocked(api.fetchPromotionEnvironments).mockReset();
		invalidateInstancePromotionConnection();
	});

	it('should fetch the instance environments once for every caller', async () => {
		vi.mocked(api.fetchPromotionEnvironments).mockResolvedValue([applyEnvironment]);
		const header = useInstancePromotionConnection();
		const modal = useInstancePromotionConnection();

		await Promise.all([header.load(), modal.load()]);

		expect(api.fetchPromotionEnvironments).toHaveBeenCalledTimes(1);
		expect(api.fetchPromotionEnvironments).toHaveBeenCalledWith({}, { scope: 'instance' });
		expect(modal.environments.value).toEqual([applyEnvironment]);
		expect(header.hasApplyConfig.value).toBe(true);
		expect(header.hasPromoteConfig.value).toBe(false);
	});

	it('should report no configured direction when the instance has no environment', async () => {
		vi.mocked(api.fetchPromotionEnvironments).mockResolvedValue([]);
		const { environments, hasApplyConfig, hasPromoteConfig, load } =
			useInstancePromotionConnection();

		await load();

		expect(environments.value).toEqual([]);
		expect(hasApplyConfig.value).toBe(false);
		expect(hasPromoteConfig.value).toBe(false);
	});

	it('should treat a failed lookup as no environment and retry on the next load', async () => {
		vi.mocked(api.fetchPromotionEnvironments)
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce([applyEnvironment]);
		const { environments, load } = useInstancePromotionConnection();

		await load();
		expect(environments.value).toEqual([]);

		await load();
		expect(environments.value).toEqual([applyEnvironment]);
		expect(api.fetchPromotionEnvironments).toHaveBeenCalledTimes(2);
	});

	it('should fetch again only after the cache is invalidated', async () => {
		vi.mocked(api.fetchPromotionEnvironments).mockResolvedValue([applyEnvironment]);
		const { load } = useInstancePromotionConnection();

		await load();
		await load();
		expect(api.fetchPromotionEnvironments).toHaveBeenCalledTimes(1);

		invalidateInstancePromotionConnection();
		await load();
		expect(api.fetchPromotionEnvironments).toHaveBeenCalledTimes(2);
	});
});
