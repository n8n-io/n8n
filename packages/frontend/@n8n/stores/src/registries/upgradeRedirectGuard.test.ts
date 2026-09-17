import {
	clearDefaultUpgradeRedirectGuard,
	getDefaultUpgradeRedirectGuard,
	setDefaultUpgradeRedirectGuard,
} from './upgradeRedirectGuard';

describe('upgradeRedirectGuard', () => {
	beforeEach(() => {
		clearDefaultUpgradeRedirectGuard();
	});

	it('proceeds when nothing is registered', async () => {
		await expect(getDefaultUpgradeRedirectGuard()()).resolves.toBe(true);
	});

	it('returns the registered guard', async () => {
		const guard = vi.fn().mockResolvedValue(false);
		setDefaultUpgradeRedirectGuard(guard);

		await expect(getDefaultUpgradeRedirectGuard()()).resolves.toBe(false);
		expect(guard).toHaveBeenCalledTimes(1);
	});

	it('lets a later registration replace an earlier one', async () => {
		setDefaultUpgradeRedirectGuard(async () => await Promise.resolve(false));
		setDefaultUpgradeRedirectGuard(async () => await Promise.resolve(true));

		await expect(getDefaultUpgradeRedirectGuard()()).resolves.toBe(true);
	});
});
