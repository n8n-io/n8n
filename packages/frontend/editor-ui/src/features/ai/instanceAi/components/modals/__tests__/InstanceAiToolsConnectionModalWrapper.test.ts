import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiToolsConnectionModalWrapper from '../InstanceAiToolsConnectionModalWrapper.vue';
import type {
	McpServerConnectionItem,
	ToolConnectionCredentialAdapter,
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
			connections: [] as Array<{
				id: string;
				serverSlug: string;
				credentialId: string;
				status: 'connecting' | 'connected' | 'disconnected';
				toolFilter: null;
			}>,
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
			fetchConnectionsLazy: vi.fn(),
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

vi.mock('../../../composables/useMcpServerConnect', () => ({
	useMcpServerConnect: () => ({
		connectServer: vi.fn().mockResolvedValue(null),
		connectWithCredential: vi.fn().mockResolvedValue(null),
		createCredentialAdapter: (
			openNewCredential: ToolConnectionCredentialAdapter['openNewCredential'],
		) => ({
			getCredentialsByType: () => [],
			openNewCredential,
			openExistingCredential: uiStoreMock.openExistingCredential,
		}),
	}),
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
		setModalData: vi.fn(),
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

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

const linearItem: McpServerConnectionItem = {
	id: 'linear',
	kind: 'mcp-server',
	title: 'Linear',
	status: 'none',
	credentials: [{ authType: 'mcpOAuth2Api', required: true }],
	availableTools: [],
};

const connectedLinearItem: McpServerConnectionItem = {
	...linearItem,
	id: 'conn-1',
	status: 'connected',
	credentials: [{ authType: 'mcpOAuth2Api', credentialId: 'cred-1', required: true }],
};

const toolSettings: ToolConnectionSettings = {
	inclusionMode: 'selected',
	selectedTools: ['search'],
	excludedTools: [],
};

let modalListeners: Record<string, unknown> = {};
let modalProps: Record<string, unknown> = {};

const ToolsConnectionModalStub = defineComponent({
	name: 'ToolsConnectionModal',
	inheritAttrs: false,
	props: ['detailItem', 'detailMode'],
	setup(props, { attrs }) {
		modalListeners = attrs;
		modalProps = props;
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
		modalProps = {};
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
		uiStoreMock.modalsById.instanceAiToolsConnection.data = {};
		mockConnect.mockResolvedValue(null);
		mockUpdateConnection.mockResolvedValue({ serverSlug: 'linear' });
	});

	it('keeps the modal open after saving settings opened from the tools list', async () => {
		renderComponent();

		emitSave(toolSettings);
		await flushPromises();

		expect(mockUpdateConnection).toHaveBeenCalledWith('conn-1', {
			inclusionMode: 'selected',
			selectedTools: ['search'],
			excludedTools: [],
		});
		expect(telemetryMock.trackToolFilterSettingsUpdated).toHaveBeenCalledWith('linear', 'selected');
		expect(uiStoreMock.closeModal).not.toHaveBeenCalled();
	});

	it('closes the modal after saving settings opened directly', async () => {
		uiStoreMock.modalsById.instanceAiToolsConnection.data = { connectionId: 'conn-1' };
		renderComponent();

		emitSave(toolSettings);
		await flushPromises();

		expect(uiStoreMock.closeModal).toHaveBeenCalledWith('instanceAiToolsConnection');
	});

	it('keeps the directly opened modal open when saving fails', async () => {
		uiStoreMock.modalsById.instanceAiToolsConnection.data = { connectionId: 'conn-1' };
		mockUpdateConnection.mockResolvedValue(null);
		renderComponent();

		emitSave(toolSettings);
		await flushPromises();

		expect(uiStoreMock.closeModal).not.toHaveBeenCalled();
	});

	it('retries tools when a disconnected connection is opened', async () => {
		const connection = {
			id: 'conn-1',
			serverSlug: 'linear',
			credentialId: 'cred-1',
			status: 'disconnected' as const,
			toolFilter: null,
		};
		mcpStoreMock.connections = [connection];
		mcpStoreMock.connectionsByServerSlug = new Map([['linear', [connection]]]);
		uiStoreMock.modalsById.instanceAiToolsConnection.data = { connectionId: 'conn-1' };

		renderComponent();
		await flushPromises();

		expect(modalProps.detailItem).toMatchObject({
			id: 'conn-1',
			status: 'disconnected',
		});
		expect(modalProps.detailMode).toBe('settings');
		expect(mcpStoreMock.fetchConnectionToolsLazy).toHaveBeenCalledWith('conn-1');
	});

	// Through the store, because what it resolves is derived state — an assignment
	// onto that is discarded, so the next open would reuse the stale connection id.
	it('clears the modal data through the store on unmount', () => {
		uiStoreMock.modalsById.instanceAiToolsConnection.data = { connectionId: 'conn-1' };

		renderComponent().unmount();

		expect(uiStoreMock.setModalData).toHaveBeenCalledWith({
			name: 'instanceAiToolsConnection',
			data: {},
		});
	});

	it('leaves the store alone on unmount when there is no data to clear', () => {
		uiStoreMock.modalsById.instanceAiToolsConnection.data = {};

		renderComponent().unmount();

		expect(uiStoreMock.setModalData).not.toHaveBeenCalled();
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
