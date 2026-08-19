import { describe, expect, it, vi } from 'vitest';

import {
	type InputMenuItem,
	useInstanceAiInputMenuItems,
} from '../composables/useInstanceAiInputMenuItems';
import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '../constants';

const { browserUseTelemetry, computerUseTelemetry, mcpTelemetry, uiStore } = vi.hoisted(() => ({
	browserUseTelemetry: {
		trackModalOpened: vi.fn(),
	},
	computerUseTelemetry: {
		trackModalOpened: vi.fn(),
	},
	mcpTelemetry: {
		trackToolsListOpened: vi.fn(),
		trackSettingsOpened: vi.fn(),
	},
	uiStore: {
		appliedTheme: 'light',
		openModal: vi.fn(),
	},
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => uiStore,
}));

vi.mock('@/experiments/instanceAiMcpConnections', () => ({
	useInstanceAiMcpConnectionsExperiment: () => ({ isFeatureEnabled: { value: true } }),
}));

vi.mock('@/experiments/instanceAiBrowserUse', () => ({
	useInstanceAiBrowserUseExperiment: () => ({ isFeatureEnabled: { value: true } }),
}));

vi.mock('@/experiments/instanceAiComputerUse', () => ({
	useInstanceAiComputerUseExperiment: () => ({ isFeatureEnabled: { value: true } }),
}));

vi.mock('../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => ({
		fetch: vi.fn(),
		settings: { mcpAccessEnabled: true },
		connections: [],
		isLocalGatewayDisabled: false,
		isLocalGatewayDisabledByAdmin: false,
		isBrowserUseEnabledByAdmin: true,
		isGatewayConnected: false,
		gatewayHostIdentifier: null,
		persistLocalGatewayPreference: vi.fn(),
		disconnectComputerUse: vi.fn(),
		disconnectBrowserUse: vi.fn(),
	}),
}));

vi.mock('../instanceAiMcp.store', () => ({
	useInstanceAiMcpStore: () => ({
		connections: [],
		fetchConnectionsLazy: vi.fn(),
		disconnect: vi.fn(),
	}),
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

describe('useInstanceAiInputMenuItems', () => {
	it('attributes connection modals to the input menu', async () => {
		const { menuItems } = useInstanceAiInputMenuItems(vi.fn());

		await findItem(menuItems.value, 'add-tool')?.data?.action?.();
		await findItem(menuItems.value, 'browser')?.data?.action?.();
		await findItem(menuItems.value, 'computer')?.data?.action?.();

		expect(mcpTelemetry.trackToolsListOpened).toHaveBeenCalledWith('input_menu');
		expect(uiStore.openModal).toHaveBeenCalledWith(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
		expect(uiStore.openModal).toHaveBeenCalledWith(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
		expect(browserUseTelemetry.trackModalOpened).toHaveBeenCalledWith('input_menu');
		expect(uiStore.openModal).toHaveBeenCalledWith(INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY);
		expect(computerUseTelemetry.trackModalOpened).toHaveBeenCalledWith(false, 'input_menu');
	});
});
