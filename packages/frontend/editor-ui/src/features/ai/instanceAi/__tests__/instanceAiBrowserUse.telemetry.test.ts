import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useInstanceAiBrowserUseTelemetry } from '../instanceAiBrowserUse.telemetry';

const track = vi.fn();

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

describe('instance ai browser use telemetry', () => {
	beforeEach(() => {
		track.mockClear();
	});

	test('tracks the connect modal opening', () => {
		useInstanceAiBrowserUseTelemetry().trackModalOpened();

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith('Instance AI Connect Browser Use modal opened');
	});

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
});
