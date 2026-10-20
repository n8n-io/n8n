import { describe, it, expect, vi, beforeEach } from 'vitest';

import { usePromotionConnectionSave } from './usePromotionConnectionSave';
import type { PromotionConnection, PromotionEnvironment } from '../promotionsSettings.api';
import { toConnection, type ConnectionWrite } from '../promotionsSettings.utils';

const api = vi.hoisted(() => ({
	createPromotionEnvironment: vi.fn(),
	updatePromotionEnvironment: vi.fn(),
	deletePromotionEnvironment: vi.fn(),
}));

vi.mock('../promotionsSettings.api', () => api);

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: {} }),
}));

const environmentFields = {
	name: 'Production',
	scope: 'instance',
	provider: { id: 'provider-1', name: 'Key', type: 'git', authType: 'ssh-key' },
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const promoteEnvironment = (matchesEnvironment: boolean, remoteUrl: string) =>
	({
		...environmentFields,
		id: 'environment-promote',
		direction: 'promote',
		remote: { schemaVersion: 1, remoteUrl },
		settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
		checkout: { hasCheckout: true, matchesEnvironment },
	}) as PromotionEnvironment;

const connectionOf = (...environments: PromotionEnvironment[]) =>
	toConnection(
		Object.fromEntries(environments.map((environment) => [environment.direction, environment])),
	) as PromotionConnection;

describe('usePromotionConnectionSave', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('uses the checkout state the server recomputed after a remote change', async () => {
		const current = connectionOf(promoteEnvironment(true, 'git@github.com:acme/old.git'));
		// The server re-reads the checkout against the new remote and reports it stale.
		api.updatePromotionEnvironment.mockResolvedValue(
			promoteEnvironment(false, 'git@github.com:acme/new.git'),
		);

		const { run } = usePromotionConnectionSave();
		const write: ConnectionWrite = {
			kind: 'update',
			direction: 'promote',
			environmentId: 'environment-promote',
			payload: { remote: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/new.git' } },
		};

		const result = await run(current, [write]);

		expect(result.failed).toEqual([]);
		expect(result.connection?.configs.promote?.checkout.matchesEnvironment).toBe(false);
	});

	it('keeps a created environment when the other direction fails to save', async () => {
		const promote = promoteEnvironment(true, 'git@github.com:acme/repo.git');
		const apply = {
			...promote,
			id: 'environment-apply',
			direction: 'apply',
			settings: { schemaVersion: 1, branchName: 'main' },
		} as PromotionEnvironment;
		api.createPromotionEnvironment.mockResolvedValue(apply);
		api.updatePromotionEnvironment.mockRejectedValue(new Error('Request failed'));

		const { run } = usePromotionConnectionSave();
		const create: ConnectionWrite = {
			kind: 'create',
			direction: 'apply',
			payload: {
				name: 'Production',
				scope: 'instance',
				direction: 'apply',
				providerId: 'provider-1',
				remote: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/repo.git' },
				settings: { schemaVersion: 1, branchName: 'main' },
			},
		};
		const update: ConnectionWrite = {
			kind: 'update',
			direction: 'promote',
			environmentId: 'environment-promote',
			payload: { name: 'Renamed' },
		};

		const result = await run(connectionOf(promote), [update, create]);

		expect(result.failed).toEqual([update]);
		expect(result.connection?.configs).toEqual({ apply, promote });
	});
});
