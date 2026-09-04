import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useInstanceAiMcpTelemetry } from '../instanceAiMcp.telemetry';

const track = vi.fn();

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

describe('instance ai mcp telemetry', () => {
	beforeEach(() => {
		track.mockClear();
	});

	test('tracks opening the tools list', () => {
		useInstanceAiMcpTelemetry().trackToolsListOpened('input_menu');

		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.TOOLS_LIST_OPENED, {
			source: 'input_menu',
		});
	});

	test('tracks opening MCP settings', () => {
		useInstanceAiMcpTelemetry().trackSettingsOpened('brave', 'mcp_connect_card');

		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.MCP_SETTINGS_OPENED, {
			server_slug: 'brave',
			source: 'mcp_connect_card',
		});
	});

	test('tracks MCP credential interactions', () => {
		const telemetry = useInstanceAiMcpTelemetry();

		telemetry.trackFirstCredentialConnectionStart('brave');
		telemetry.trackCredentialDropdownOpened('brave');
		telemetry.trackExistingCredentialSelected('brave');
		telemetry.trackNewCredentialConnectionStart('brave');

		const payload = { server_slug: 'brave' };
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.MCP_FIRST_CREDENTIAL_CONNECTION_STARTED,
			payload,
		);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.MCP_CREDENTIAL_DROPDOWN_OPENED,
			payload,
		);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.MCP_EXISTING_CREDENTIAL_SELECTED,
			payload,
		);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.MCP_NEW_CREDENTIAL_CONNECTION_STARTED,
			payload,
		);
	});

	test('tracks MCP tool filter updates', () => {
		useInstanceAiMcpTelemetry().trackToolFilterSettingsUpdated('brave', 'selected');

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE_AI.MCP_TOOL_FILTER_SETTINGS_UPDATED,
			{
				server_slug: 'brave',
				inclusion_mode: 'selected',
			},
		);
	});
});
