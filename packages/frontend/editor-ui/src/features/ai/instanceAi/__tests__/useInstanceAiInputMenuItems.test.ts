import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	type InputMenuItem,
	useInstanceAiInputMenuItems,
} from '../composables/useInstanceAiInputMenuItems';
import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '../constants';

const {
	browserUseTelemetry,
	computerUseTelemetry,
	featureFlags,
	mcpStore,
	mcpTelemetry,
	settingsStore,
	uiStore,
} = vi.hoisted(() => ({
	browserUseTelemetry: { trackModalOpened: vi.fn() },
	computerUseTelemetry: { trackModalOpened: vi.fn() },
	featureFlags: { browserUse: true, computerUse: true, mcp: true },
	mcpStore: {
		connections: [] as Array<Record<string, unknown>>,
		fetchConnectionsLazy: vi.fn(),
		disconnect: vi.fn(),
	},
	mcpTelemetry: {
		trackToolsListOpened: vi.fn(),
		trackSettingsOpened: vi.fn(),
	},
	settingsStore: {
		fetch: vi.fn(),
		settings: { mcpAccessEnabled: true },
		connections: [] as Array<Record<string, unknown>>,
		isLocalGatewayDisabled: false,
		isLocalGatewayDisabledByAdmin: false,
		isBrowserUseEnabledByAdmin: true,
		isGatewayConnected: false,
		gatewayHostIdentifier: null as string | null,
		persistLocalGatewayPreference: vi.fn(),
		disconnectComputerUse: vi.fn(),
		disconnectBrowserUse: vi.fn(),
	},
	uiStore: {
		appliedTheme: 'light',
		openModal: vi.fn(),
		openModalWithData: vi.fn(),
	},
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => uiStore,
}));

vi.mock('@/experiments/instanceAiMcpConnections', () => ({
	useInstanceAiMcpConnectionsExperiment: () => ({
		isFeatureEnabled: {
			get value() {
				return featureFlags.mcp;
			},
		},
	}),
}));

vi.mock('@/experiments/instanceAiBrowserUse', () => ({
	useInstanceAiBrowserUseExperiment: () => ({
		isFeatureEnabled: {
			get value() {
				return featureFlags.browserUse;
			},
		},
	}),
}));

vi.mock('@/experiments/instanceAiComputerUse', () => ({
	useInstanceAiComputerUseExperiment: () => ({
		isFeatureEnabled: {
			get value() {
				return featureFlags.computerUse;
			},
		},
	}),
}));

vi.mock('../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => settingsStore,
}));

vi.mock('../instanceAiMcp.store', () => ({
	useInstanceAiMcpStore: () => mcpStore,
}));

vi.mock('../instanceAiMcp.telemetry', () => ({
	useInstanceAiMcpTelemetry: () => mcpTelemetry,
}));

vi.mock('../instanceAiBrowserUse.telemetry', () => ({
	useInstanceAiBrowserUseTelemetry: () => browserUseTelemetry,
}));

vi.mock('../instanceAiComputerUse.telemetry', () => ({
	useInstanceAiComputerUseTelemetry: () => computerUseTelemetry,
}));

function findItem(items: InputMenuItem[], id: string): InputMenuItem | undefined {
	for (const item of items) {
		if (item.id === id) return item;
		const child = item.children ? findItem(item.children, id) : undefined;
		if (child) return child;
	}
	return undefined;
}

function makeMcpConnection(id: string, status: 'connected' | 'connecting' | 'disconnected') {
	return {
		id,
		serverSlug: `server-${id}`,
		serverTitle: `Server ${id}`,
		serverIcons: [],
		credentialName: `Credential ${id}`,
		status,
	};
}

const mcpStatusCases: Array<{
	statuses: Array<'connected' | 'connecting' | 'disconnected'>;
	expectedStatus: 'connected' | 'connecting' | 'disconnected' | undefined;
}> = [
	{ statuses: [], expectedStatus: undefined },
	{ statuses: ['connected'], expectedStatus: 'connected' },
	{ statuses: ['connected', 'disconnected'], expectedStatus: 'disconnected' },
	{ statuses: ['disconnected', 'connecting'], expectedStatus: 'connecting' },
];

describe('useInstanceAiInputMenuItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		featureFlags.browserUse = true;
		featureFlags.computerUse = true;
		featureFlags.mcp = true;
		mcpStore.connections = [];
		settingsStore.settings.mcpAccessEnabled = true;
		settingsStore.connections = [];
		settingsStore.isLocalGatewayDisabled = false;
		settingsStore.isLocalGatewayDisabledByAdmin = false;
		settingsStore.isBrowserUseEnabledByAdmin = true;
		settingsStore.isGatewayConnected = false;
		settingsStore.gatewayHostIdentifier = null;
	});

	it('omits connection groups disabled by feature or admin settings', () => {
		featureFlags.mcp = false;
		settingsStore.isLocalGatewayDisabledByAdmin = true;
		settingsStore.isBrowserUseEnabledByAdmin = false;

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

		expect(menuItems.value.map(({ id }) => id)).toEqual(['attach-files']);
		expect(mcpStore.fetchConnectionsLazy).not.toHaveBeenCalled();
	});

	it.each(mcpStatusCases)(
		'summarizes MCP statuses $statuses as $expectedStatus',
		({ statuses, expectedStatus }) => {
			mcpStore.connections = statuses.map((status, index) =>
				makeMcpConnection(String(index), status),
			);

			const { menuItems, hasDisconnectedMcpConnection } = useInstanceAiInputMenuItems(vi.fn());
			const tools = findItem(menuItems.value, 'tools');

			expect(tools?.data?.status).toBe(expectedStatus);
			expect(hasDisconnectedMcpConnection.value).toBe(statuses.includes('disconnected'));
		},
	);

	it('delegates attachment and connection actions to their owners', async () => {
		const attachFiles = vi.fn();
		settingsStore.isLocalGatewayDisabled = true;
		settingsStore.connections = [
			{ type: 'computer-use', status: 'connected' },
			{ type: 'browser-use', status: 'disconnected' },
		];
		mcpStore.connections = [makeMcpConnection('1', 'connected')];
		const { menuItems } = useInstanceAiInputMenuItems(attachFiles);

		await findItem(menuItems.value, 'attach-files')?.data?.action?.();
		await findItem(menuItems.value, 'mcp-1-setup')?.data?.action?.();
		await findItem(menuItems.value, 'mcp-1-disconnect')?.data?.action?.();
		await findItem(menuItems.value, 'computer-disconnect')?.data?.action?.();
		await findItem(menuItems.value, 'browser')?.data?.action?.();

		expect(attachFiles).toHaveBeenCalledOnce();
		expect(mcpTelemetry.trackSettingsOpened).toHaveBeenCalledWith('server-1', 'input_menu');
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
			data: { connectionId: '1' },
		});
		expect(mcpStore.disconnect).toHaveBeenCalledWith('1');
		expect(settingsStore.disconnectComputerUse).toHaveBeenCalledOnce();
		expect(browserUseTelemetry.trackModalOpened).toHaveBeenCalledWith('input_menu');
		expect(uiStore.openModal).toHaveBeenCalledWith(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
	});
});
