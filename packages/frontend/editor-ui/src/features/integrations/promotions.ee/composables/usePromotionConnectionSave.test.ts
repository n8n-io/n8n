import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePromotionConnectionSave } from './usePromotionConnectionSave';
import type { PromotionConnection } from '../promotionsSettings.api';
import type { ConnectionWrite } from '../promotionsSettings.utils';

const api = vi.hoisted(() => ({
	updatePromotionConnection: vi.fn(),
	upsertPromotionApplyConfig: vi.fn(),
	upsertPromotionPromoteConfig: vi.fn(),
	deletePromotionConfig: vi.fn(),
}));

vi.mock('../promotionsSettings.api', () => api);

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: {} }),
}));

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const connectionWith = (matchesConfig: boolean, remoteUrl: string): PromotionConnection =>
	({
		id: 'connection-1',
		name: 'Production',
		scope: 'instance',
		target: { schemaVersion: 1, remoteUrl },
		configs: {
			promote: {
				id: 'config-promote',
				name: 'Promote',
				settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
				checkout: { hasCheckout: true, matchesConfig },
				...timestamps,
			},
		},
		...timestamps,
	}) as unknown as PromotionConnection;

describe('usePromotionConnectionSave', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('uses the checkout state the server recomputed after a target change', async () => {
		const current = connectionWith(true, 'git@github.com:acme/old.git');
		// The server re-reads the checkout against the new remote and reports it stale.
		api.updatePromotionConnection.mockResolvedValue(
			connectionWith(false, 'git@github.com:acme/new.git'),
		);

		const { run } = usePromotionConnectionSave();
		const write: ConnectionWrite = {
			kind: 'connection',
			payload: { target: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/new.git' } },
		};

		const result = await run(current, [write]);

		expect(result.failed).toEqual([]);
		expect(result.connection.configs.promote?.checkout.matchesConfig).toBe(false);
	});
});
