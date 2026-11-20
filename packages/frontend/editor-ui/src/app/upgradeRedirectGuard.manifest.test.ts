import {
	clearDefaultUpgradeRedirectGuard,
	getDefaultUpgradeRedirectGuard,
} from '@n8n/stores/registries/upgradeRedirectGuard';

import { registerUpgradeRedirectGuard } from './upgradeRedirectGuard.manifest';

const confirmIfBuilderStreaming = vi.fn();

vi.mock('@/features/ai/assistant/composables/useBuilderStreamingGuard', () => ({
	get confirmIfBuilderStreaming() {
		return confirmIfBuilderStreaming;
	},
}));

describe('registerUpgradeRedirectGuard', () => {
	beforeEach(() => {
		clearDefaultUpgradeRedirectGuard();
		confirmIfBuilderStreaming.mockReset();
	});

	afterEach(() => {
		clearDefaultUpgradeRedirectGuard();
	});

	it('leaves the registry failing open until it is called', async () => {
		// The unregistered default proceeds, so an unregistered guard is silent, not loud.
		await expect(getDefaultUpgradeRedirectGuard()()).resolves.toBe(true);
		expect(confirmIfBuilderStreaming).not.toHaveBeenCalled();
	});

	it('registers a guard that delegates to the builder streaming confirmation', async () => {
		confirmIfBuilderStreaming.mockResolvedValue(false);
		registerUpgradeRedirectGuard();

		await expect(getDefaultUpgradeRedirectGuard()()).resolves.toBe(false);
		expect(confirmIfBuilderStreaming).toHaveBeenCalledTimes(1);
	});

	it('passes a confirmation through', async () => {
		confirmIfBuilderStreaming.mockResolvedValue(true);
		registerUpgradeRedirectGuard();

		await expect(getDefaultUpgradeRedirectGuard()()).resolves.toBe(true);
	});

	it('does not load the guard module until the guard runs', () => {
		confirmIfBuilderStreaming.mockResolvedValue(true);
		registerUpgradeRedirectGuard();

		// Registration alone must not reach the builder store: that is what keeps the
		// builder out of the boot chunk.
		expect(confirmIfBuilderStreaming).not.toHaveBeenCalled();
	});
});
