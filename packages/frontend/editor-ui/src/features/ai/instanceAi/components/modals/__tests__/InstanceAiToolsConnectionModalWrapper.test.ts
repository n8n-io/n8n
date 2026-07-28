import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiToolsConnectionModalWrapper from '../InstanceAiToolsConnectionModalWrapper.vue';
import type {
	McpServerConnectionItem,
	ToolConnectionSettings,
} from '@/features/shared/toolsConnection/types';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	i18n: { baseText: (key: string) => key },
}));

vi.mock('@/experiments/instanceAiMcpConnections', () => ({
	useInstanceAiMcpConnectionsExperiment: () => ({ isFeatureEnabled: { value: true } }),
}));

vi.mock('@/experiments/instanceAiComputerUse', () => ({
	useInstanceAiComputerUseExperiment: () => ({ isFeatureEnabled: { value: false } }),
}));

vi.mock('@/experiments/instanceAiBrowserUse', () => ({
	useInstanceAiBrowserUseExperiment: () => ({ isFeatureEnabled: { value: false } }),
}));

const { mockConnect, mockUpdateConnection, mcpStoreMock } = vi.hoisted(() => {
	const mockConnect = vi.fn();
	const mockUpdateConnection = vi.fn();
	return {
		mockConnect,
		mockUpdateConnection,
		mcpStoreMock: {
			connections: [] as Array<{ id: string; serverSlug: string; credentialId?: string }>,
			catalog: [] as Array<{
				slug: string;
				title: string;
				tagline: string;
				description: string;
				credentialType: string;
				tools: never[];
				icons: never[];
				isOfficial: boolean;
				version: string;
				websiteUrl: string;
			}>,
			connectionsByServerSlug: new Map(),
			connectionToolsById: new Map(),
			fetchCatalogLazy: vi.fn(),
			fetchConnections: vi.fn(),
			fetchConnectionToolsLazy: vi.fn(),
			connect: mockConnect,
			updateConnection: mockUpdateConnection,
			disconnect: vi.fn(),
		},
	};
});
vi.mock('../../../instanceAiMcp.store', () => ({
	useInstanceAiMcpStore: () => mcpStoreMock,
}));

vi.mock('../../../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => ({
		settings: { mcpAccessEnabled: true },
		isLocalGatewayDisabledByAdmin: false,
		isBrowserUseEnabledByAdmin: false,
		isGatewayConnected: false,
		isBrowserUseConnected: false,
	}),
}));

const { telemetryMock, uiStoreMock } = vi.hoisted(() => ({
	telemetryMock: {
		trackToolFilterSettingsUpdated: vi.fn(),
		trackFirstCredentialConnectionStart: vi.fn(),
		trackCredentialDropdownOpened: vi.fn(),
		trackExistingCredentialSelected: vi.fn(),
		trackNewCredentialConnectionStart: vi.fn(),
	},
	uiStoreMock: {
		modalsById: {
			instanceAiToolsConnection: { open: true, data: {} },
		},
		closeModal: vi.fn(),
		openNewCredential: vi.fn(),
		openExistingCredential: vi.fn(),
		appliedTheme: 'light',
	},
}));

vi.mock('../../../instanceAiMcp.telemetry', () => ({
	useInstanceAiMcpTelemetry: () => telemetryMock,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => uiStoreMock,
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		fetchAllCredentials: vi.fn().mockResolvedValue([]),
		getCredentialsByType: vi.fn().mockReturnValue([]),
	}),
}));

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		canOAuthCredentialQuickConnect: vi.fn().mockReturnValue(false),
		createAndAuthorize: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

const linearItem: McpServerConnectionItem = {
	id: 'linear',
	kind: 'mcp-server',
	title: 'Linear',
	isConnected: false,
	credentials: [{ authType: 'mcpOAuth2Api', required: true }],
	availableTools: [],
};

const connectedLinearItem: McpServerConnectionItem = {
	...linearItem,
	id: 'conn-1',
	isConnected: true,
	credentials: [{ authType: 'mcpOAuth2Api', credentialId: 'cred-1', required: true }],
};

let modalListeners: Record<string, unknown> = {};

const ToolsConnectionModalStub = defineComponent({
	name: 'ToolsConnectionModal',
	inheritAttrs: false,
	setup(_, { attrs }) {
		modalListeners = attrs;
		return {};
	},
	template: '<div data-test-id="tools-connection-modal-stub" />',
});

function emitModalEvent<Args extends unknown[]>(eventName: string, ...args: Args): void {
	const listener = modalListeners[eventName];
	if (typeof listener !== 'function') {
		throw new Error(`Missing modal listener: ${eventName}`);
	}

	(listener as (...listenerArgs: Args) => void)(...args);
}

function emitSave(settings: ToolConnectionSettings): void {
	emitModalEvent('onSave', connectedLinearItem, settings);
}

function emitSelectCredential(): void {
	emitModalEvent('onSelectCredential', linearItem, 'mcpOAuth2Api', 'cred-1');
}

function emitFirstCredentialConnect(): void {
	emitModalEvent('onFirstCredentialConnect', linearItem);
}

function emitCredentialDropdownOpen(): void {
	emitModalEvent('onCredentialDropdownOpen', linearItem);
}

function emitNewCredentialConnect(): void {
	emitModalEvent('onNewCredentialConnect', linearItem);
}

const renderComponent = createComponentRenderer(InstanceAiToolsConnectionModalWrapper, {
	props: { modalName: 'instanceAiToolsConnection' },
	global: {
		stubs: {
			ToolsConnectionModal: ToolsConnectionModalStub,
		},
	},
});

describe('InstanceAiToolsConnectionModalWrapper', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		modalListeners = {};
		mcpStoreMock.connections = [];
		mcpStoreMock.catalog = [
			{
				slug: 'linear',
				title: 'Linear',
				tagline: 'Linear MCP',
				description: 'Linear MCP',
				credentialType: 'mcpOAuth2Api',
				tools: [],
				icons: [],
				isOfficial: true,
				version: '1.0.0',
				websiteUrl: 'https://linear.app',
			},
		];
		mcpStoreMock.connectionsByServerSlug = new Map();
		mcpStoreMock.connectionToolsById = new Map();
		mockConnect.mockResolvedValue(null);
		mockUpdateConnection.mockResolvedValue({ serverSlug: 'linear' });
	});

	it('tracks tool filter settings after a successful save', async () => {
		renderComponent();

		emitSave({
			inclusionMode: 'selected',
			selectedTools: ['search'],
			excludedTools: [],
		});
		await flushPromises();

		expect(mockUpdateConnection).toHaveBeenCalledWith('conn-1', {
			inclusionMode: 'selected',
			selectedTools: ['search'],
			excludedTools: [],
		});
		expect(telemetryMock.trackToolFilterSettingsUpdated).toHaveBeenCalledWith('linear', 'selected');
	});

	it('tracks first credential connection start', () => {
		renderComponent();

		emitFirstCredentialConnect();

		expect(telemetryMock.trackFirstCredentialConnectionStart).toHaveBeenCalledWith('linear');
	});

	it('tracks credential dropdown opening', () => {
		renderComponent();

		emitCredentialDropdownOpen();

		expect(telemetryMock.trackCredentialDropdownOpened).toHaveBeenCalledWith('linear');
	});

	it('tracks existing credential selection', async () => {
		renderComponent();

		emitSelectCredential();
		await flushPromises();

		expect(telemetryMock.trackExistingCredentialSelected).toHaveBeenCalledWith('linear');
	});

	it('tracks new credential connection start', () => {
		renderComponent();

		emitNewCredentialConnect();

		expect(telemetryMock.trackNewCredentialConnectionStart).toHaveBeenCalledWith('linear');
	});
});
