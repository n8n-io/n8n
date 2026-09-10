import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useInstanceAiComputerUseTelemetry } from '../instanceAiComputerUse.telemetry';

const track = vi.fn();

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

describe('instance ai computer use telemetry', () => {
	beforeEach(() => {
		track.mockClear();
	});

	test('tracks the connection modal opening', () => {
		useInstanceAiComputerUseTelemetry().trackModalOpened(true, 'tools_modal');

		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.COMPUTER_USE_MODAL_OPENED, {
			is_connected: true,
			source: 'tools_modal',
		});
	});

	test('tracks copying the connection command', () => {
		useInstanceAiComputerUseTelemetry().trackCommandCopied('linux');

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.COMPUTER_USE_CONNECTION_COMMAND_COPIED,
			{ os: 'linux' },
		);
	});
});
