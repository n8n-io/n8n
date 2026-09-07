import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-level state holders. We cannot use `ref` inside `vi.hoisted` (it runs
// before module imports), so we declare them at module scope instead.
// vi.mock factories can still close over them.
// NOTE: we expose primitive values, not refs, because Pinia auto-unwraps refs when
// it returns store properties, but our hand-rolled mock does not.
let stateLimit = 0 as number;
let stateHasLoadedLicense = false;
const stateGetLicenseInfo = vi.fn<() => Promise<void>>();

vi.mock('@/features/settings/usage/usage.store', () => ({
	useUsageStore: () => ({
		get workflowsWithEvaluationsLimit() {
			return stateLimit;
		},
		get hasLoadedLicense() {
			return stateHasLoadedLicense;
		},
		getLicenseInfo: stateGetLicenseInfo,
	}),
}));

// Import AFTER mocks are set up.
// We use vi.resetModules() in beforeEach to reset the module-cached licensePromise
// between tests so each test starts with a clean state.

describe('useEvaluationsLicense', () => {
	beforeEach(async () => {
		stateLimit = 0;
		stateHasLoadedLicense = false;
		stateGetLicenseInfo.mockReset();
		stateGetLicenseInfo.mockResolvedValue(undefined);
		// Reset modules to clear the module-cached licensePromise.
		vi.resetModules();
	});

	async function getComposable() {
		// Re-import after resetModules so we get a fresh licensePromise each test.
		const { useEvaluationsLicense } = await import('./useEvaluationsLicense');
		return useEvaluationsLicense();
	}

	describe('isLicensed', () => {
		it('is false when limit is 0 (unlicensed)', async () => {
			stateLimit = 0;
			const { isLicensed } = await getComposable();
			expect(isLicensed.value).toBe(false);
		});

		it('is true when limit is -1 (unlimited)', async () => {
			stateLimit = -1;
			const { isLicensed } = await getComposable();
			expect(isLicensed.value).toBe(true);
		});

		it('is true when limit is a positive number (capped)', async () => {
			stateLimit = 5;
			const { isLicensed } = await getComposable();
			expect(isLicensed.value).toBe(true);
		});
	});

	describe('isResolved', () => {
		it('is false when hasLoadedLicense is false', async () => {
			stateHasLoadedLicense = false;
			const { isResolved } = await getComposable();
			expect(isResolved.value).toBe(false);
		});

		it('is true when hasLoadedLicense is true', async () => {
			stateHasLoadedLicense = true;
			const { isResolved } = await getComposable();
			expect(isResolved.value).toBe(true);
		});
	});

	describe('ensureLicenseLoaded', () => {
		it('calls getLicenseInfo on first invocation', async () => {
			const { ensureLicenseLoaded } = await getComposable();
			await ensureLicenseLoaded();
			expect(stateGetLicenseInfo).toHaveBeenCalledTimes(1);
		});

		it('deduplicates: calling twice only calls getLicenseInfo once', async () => {
			const { ensureLicenseLoaded } = await getComposable();
			// Call twice concurrently.
			await Promise.all([ensureLicenseLoaded(), ensureLicenseLoaded()]);
			expect(stateGetLicenseInfo).toHaveBeenCalledTimes(1);
		});

		it('deduplicates: second sequential call also only calls getLicenseInfo once', async () => {
			const { ensureLicenseLoaded } = await getComposable();
			await ensureLicenseLoaded();
			await ensureLicenseLoaded();
			expect(stateGetLicenseInfo).toHaveBeenCalledTimes(1);
		});

		it('resets cache on error so next call retries', async () => {
			stateGetLicenseInfo
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValue(undefined);

			const { ensureLicenseLoaded } = await getComposable();

			// First call fails — should not throw (errors are swallowed).
			await expect(ensureLicenseLoaded()).resolves.toBeUndefined();

			// After failure the cache is reset, so the next call retries.
			await ensureLicenseLoaded();
			expect(stateGetLicenseInfo).toHaveBeenCalledTimes(2);
		});
	});
});
