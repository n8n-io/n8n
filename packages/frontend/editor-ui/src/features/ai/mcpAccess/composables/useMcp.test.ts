import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';

const { trackSpy } = vi.hoisted(() => ({ trackSpy: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackSpy }),
}));

describe('useMcp', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should report where the connect dialog was opened from', () => {
		useMcp().trackConnectClientClicked('settings');

		expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.USER_CLICKED_CONNECT_CLIENT, {
			source: 'settings',
		});
	});

	it('should track the instance-wide clients view', () => {
		useMcp().trackViewedAllClients();

		expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.USER_VIEWED_ALL_MCP_CLIENTS, {});
	});

	it('should resolve brand and type from the revoked client name', () => {
		useMcp().trackClientAccessRevoked({
			clientId: 'client-1',
			clientName: 'Cursor',
			revokedForOther: false,
		});

		expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.USER_REVOKED_MCP_CLIENT_ACCESS, {
			client_id: 'client-1',
			client_brand: 'cursor',
			client_type: 'ide',
			revoked_for_other: false,
		});
	});

	it('should send null brand and type for a client name matching no known brand', () => {
		useMcp().trackClientAccessRevoked({
			clientId: 'client-2',
			clientName: 'some-in-house-agent',
			revokedForOther: true,
		});

		expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.USER_REVOKED_MCP_CLIENT_ACCESS, {
			client_id: 'client-2',
			client_brand: null,
			client_type: null,
			revoked_for_other: true,
		});
	});
});
