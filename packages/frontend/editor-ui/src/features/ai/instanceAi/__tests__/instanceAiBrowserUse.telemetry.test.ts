import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useInstanceAiBrowserUseTelemetry } from '../instanceAiBrowserUse.telemetry';

const { isBrowserSupported, track } = vi.hoisted(() => ({
	isBrowserSupported: vi.fn(),
	track: vi.fn(),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@/experiments/instanceAiBrowserUse', () => ({
	isBrowserUseSupportedForBrowser: isBrowserSupported,
}));

describe('instance ai browser use telemetry', () => {
	beforeEach(() => {
		track.mockClear();
	});

	test.each([true, false])(
		'tracks the connect modal opening with browser_supported %s',
		(browserSupported) => {
			isBrowserSupported.mockReturnValue(browserSupported);
			useInstanceAiBrowserUseTelemetry().trackModalOpened('input_menu');

			expect(track).toHaveBeenCalledTimes(1);
			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_MODAL_OPENED, {
				browser_supported: browserSupported,
				source: 'input_menu',
			});
		},
	);

	test('tracks the install extension button click', () => {
		useInstanceAiBrowserUseTelemetry().trackInstallExtensionClicked();

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_INSTALL_EXTENSION_CLICKED,
			{},
		);
	});

	test('tracks the open extension button click', () => {
		useInstanceAiBrowserUseTelemetry().trackOpenExtensionClicked();

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_OPEN_EXTENSION_CLICKED,
			{},
		);
	});

	test('tracks a direct connect request', () => {
		useInstanceAiBrowserUseTelemetry().trackDirectConnectRequested();

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.BROWSER_USE_DIRECT_CONNECT_REQUESTED,
			{},
		);
	});
});
