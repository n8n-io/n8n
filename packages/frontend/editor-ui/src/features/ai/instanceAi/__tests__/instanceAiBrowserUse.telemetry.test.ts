import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useInstanceAiBrowserUseTelemetry } from '../instanceAiBrowserUse.telemetry';

const track = vi.fn();

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

describe('instance ai browser use telemetry', () => {
	beforeEach(() => {
		track.mockClear();
	});

	test.each([true, false])(
		'tracks the connect modal opening with browser_supported %s',
		(browserSupported) => {
			useInstanceAiBrowserUseTelemetry().trackModalOpened(browserSupported);

			expect(track).toHaveBeenCalledTimes(1);
			expect(track).toHaveBeenCalledWith('Instance AI Connect Browser Use modal opened', {
				browser_supported: browserSupported,
			});
		},
	);

	test('tracks the install extension button click', () => {
		useInstanceAiBrowserUseTelemetry().trackInstallExtensionClicked();

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			'Instance AI Install Chrome Browser Extension button clicked',
		);
	});

	test('tracks the open extension button click', () => {
		useInstanceAiBrowserUseTelemetry().trackOpenExtensionClicked();

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith('Instance AI Open Browser Use Extension button clicked');
	});

	test('tracks a direct connect request', () => {
		useInstanceAiBrowserUseTelemetry().trackDirectConnectRequested();

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith('Instance AI Browser Use direct connect requested');
	});
});
