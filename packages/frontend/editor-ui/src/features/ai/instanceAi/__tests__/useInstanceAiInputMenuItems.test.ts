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
		isLocalGatewayDisabled: false,
		isLocalGatewayDisabledByAdmin: false,
		isBrowserUseEnabledByAdmin: true,
		isGatewayConnected: false,
		computerUseConnectionStatus: 'none',
		browserUseConnectionStatus: 'none',
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
		settingsStore.isLocalGatewayDisabled = false;
		settingsStore.isLocalGatewayDisabledByAdmin = false;
		settingsStore.isBrowserUseEnabledByAdmin = true;
		settingsStore.isGatewayConnected = false;
		settingsStore.computerUseConnectionStatus = 'none';
		settingsStore.browserUseConnectionStatus = 'none';
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

			const { menuItems, disconnectedConnectionCount } = useInstanceAiInputMenuItems(vi.fn());
			const tools = findItem(menuItems.value, 'tools');

			expect(tools?.data?.status).toBe(expectedStatus);
			expect(disconnectedConnectionCount.value).toBe(
				statuses.filter((status) => status === 'disconnected').length,
			);
		},
	);

	it.each([
		{
			id: 'computer',
			setDisconnected: () => {
				settingsStore.computerUseConnectionStatus = 'disconnected';
				settingsStore.gatewayHostIdentifier = 'Work computer';
			},
			modal: INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
			title: 'Work computer',
		},
		{
			id: 'browser',
			setDisconnected: () => {
				settingsStore.browserUseConnectionStatus = 'disconnected';
			},
			modal: INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
			title: 'instanceAi.inputMenu.browser.connectedTitle',
		},
	])(
		'shows a Reconnect menu when $id disconnects unexpectedly',
		async ({ id, setDisconnected, modal, title }) => {
			setDisconnected();
			const { menuItems, disconnectedConnectionCount } = useInstanceAiInputMenuItems(vi.fn());

			const item = findItem(menuItems.value, id);
			expect(item?.data?.status).toBe('disconnected');
			expect(item?.data?.action).toBeUndefined();
			expect(findItem(menuItems.value, `${id}-status`)?.label).toBe(title);
			expect(disconnectedConnectionCount.value).toBe(1);

			await findItem(menuItems.value, `${id}-reconnect`)?.data?.action?.();
			expect(uiStore.openModal).toHaveBeenCalledWith(modal);
		},
	);

	it('keeps user-disconnected services as direct Connect actions', () => {
		const { menuItems, disconnectedConnectionCount } = useInstanceAiInputMenuItems(vi.fn());

		for (const id of ['computer', 'browser']) {
			const item = findItem(menuItems.value, id);
			expect(item?.data?.status).toBe('none');
			expect(item?.children).toBeUndefined();
			expect(item?.data?.action).toBeTypeOf('function');
		}
		expect(disconnectedConnectionCount.value).toBe(0);
	});

	it('does not offer direct Browser Use disconnect when browser access comes from Computer Use', () => {
		settingsStore.isGatewayConnected = true;

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

		expect(findItem(menuItems.value, 'browser-disconnect')).toBeUndefined();
		expect(findItem(menuItems.value, 'browser')?.label).toBe(
			'instanceAi.inputMenu.browser.connect',
		);
	});

	it('disconnects Browser Use when the direct extension is connected', async () => {
		settingsStore.browserUseConnectionStatus = 'connected';

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());
		await findItem(menuItems.value, 'browser-disconnect')?.data?.action?.();

		expect(settingsStore.disconnectBrowserUse).toHaveBeenCalledOnce();
	});

	it('shows Computer Use as connecting while daemon pairing is in progress', () => {
		settingsStore.computerUseConnectionStatus = 'connecting';

		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

		expect(findItem(menuItems.value, 'computer')?.data?.status).toBe('connecting');
	});

	it('delegates attachment and connection actions to their owners', async () => {
		const attachFiles = vi.fn();
		settingsStore.isLocalGatewayDisabled = true;
		settingsStore.isGatewayConnected = true;
		settingsStore.computerUseConnectionStatus = 'connected';
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
