import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, nextTick, reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import InstanceAiToolsConnectionModalWrapper from '../InstanceAiToolsConnectionModalWrapper.vue';
import type {
	McpServerConnectionItem,
	ServiceConnectionItem,
	ToolConnectionCredentialAdapter,
	ToolConnectionSettings,
} from '@/features/shared/toolsConnection/types';

const featureFlags = vi.hoisted(() => ({ browserUse: false, computerUse: false }));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	i18n: { baseText: (key: string) => key },
}));

vi.mock('@/experiments/instanceAiMcpConnections', () => ({
	useInstanceAiMcpConnectionsExperiment: () => ({ isFeatureEnabled: { value: true } }),
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

vi.mock('@/experiments/instanceAiBrowserUse', () => ({
	useInstanceAiBrowserUseExperiment: () => ({
		isFeatureEnabled: {
			get value() {
				return featureFlags.browserUse;
			},
		},
	}),
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
				credentials: Array<{
					credentialType: string;
					name: string;
					value: string;
				}>;
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
		isBrowserUseEnabledByAdmin: true,
		isGatewayConnected: false,
		isBrowserUseConnected: false,
	}),
}));

const { browserTelemetryMock, computerTelemetryMock, telemetryMock, uiStoreMock } = vi.hoisted(
	() => ({
		browserTelemetryMock: {
			trackModalOpened: vi.fn(),
		},
		computerTelemetryMock: {
			trackModalOpened: vi.fn(),
		},
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
			} as Record<string, { open: boolean; data?: Record<string, unknown> }>,
			closeModal: vi.fn(),
			setModalData: vi.fn(),
			openNewCredential: vi.fn(),
			openExistingCredential: vi.fn(),
			appliedTheme: 'light',
		},
	}),
);

uiStoreMock.modalsById = reactive(uiStoreMock.modalsById);

vi.mock('../../../instanceAiMcp.telemetry', () => ({
	useInstanceAiMcpTelemetry: () => telemetryMock,
}));

vi.mock('../../../instanceAiBrowserUse.telemetry', () => ({
	useInstanceAiBrowserUseTelemetry: () => browserTelemetryMock,
}));

vi.mock('../../../instanceAiComputerUse.telemetry', () => ({
	useInstanceAiComputerUseTelemetry: () => computerTelemetryMock,
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
	props: ['open', 'detailItem', 'detailMode', 'items'],
	setup(props, { attrs }) {
		modalListeners = attrs;
		modalProps = props;
		return {};
	},
	template:
		'<div data-test-id="tools-connection-modal-stub"><slot name="suggestion-footer" /></div>',
});

const McpRegistrySuggestionFooterStub = defineComponent({
	name: 'McpRegistrySuggestionFooter',
	props: ['prompt', 'action'],
	template: '<div><span>{{ prompt }}</span><span>{{ action }}</span></div>',
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
			McpRegistrySuggestionFooter: McpRegistrySuggestionFooterStub,
		},
	},
});

describe('InstanceAiToolsConnectionModalWrapper', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		featureFlags.browserUse = false;
		featureFlags.computerUse = false;
		modalListeners = {};
		modalProps = {};
		mcpStoreMock.connections = [];
		mcpStoreMock.catalog = [
			{
				slug: 'linear',
				title: 'Linear',
				tagline: 'Linear MCP',
				description: 'Linear MCP',
				credentials: [{ credentialType: 'mcpOAuth2Api', name: 'OAuth2', value: 'oAuth2' }],
				tools: [],
				icons: [],
				isOfficial: true,
				version: '1.0.0',
				websiteUrl: 'https://linear.app',
			},
		];
		mcpStoreMock.connectionsByServerSlug = new Map();
		mcpStoreMock.connectionToolsById = new Map();
		uiStoreMock.modalsById.instanceAiToolsConnection.open = true;
		uiStoreMock.modalsById.instanceAiToolsConnection.data = {};
		delete uiStoreMock.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
		mockConnect.mockResolvedValue(null);
		mockUpdateConnection.mockResolvedValue({ serverSlug: 'linear' });
	});

	it('configures the suggestion footer copy', () => {
		const { getByText } = renderComponent();

		expect(getByText('instanceAi.connections.modal.suggestion.prompt')).toBeInTheDocument();
		expect(getByText('instanceAi.connections.modal.suggestion.action')).toBeInTheDocument();
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

	it('hides and restores the selected connection while editing a credential', async () => {
		uiStoreMock.modalsById.instanceAiToolsConnection.data = { connectionId: 'linear' };
		renderComponent();

		expect(modalProps.open).toBe(true);
		expect(modalProps.detailItem).toMatchObject({ id: 'linear' });

		uiStoreMock.modalsById[CREDENTIAL_EDIT_MODAL_KEY] = { open: true };
		await nextTick();

		expect(modalProps.open).toBe(false);
		expect(uiStoreMock.closeModal).not.toHaveBeenCalled();

		uiStoreMock.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open = false;
		await nextTick();

		expect(modalProps.open).toBe(true);
		expect(modalProps.detailItem).toMatchObject({ id: 'linear' });

		emitModalEvent('onUpdate:open', false);
		expect(uiStoreMock.closeModal).toHaveBeenCalledWith('instanceAiToolsConnection');
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

	it('tracks opening built-in connection details', () => {
		featureFlags.browserUse = true;
		featureFlags.computerUse = true;
		renderComponent();
		const serviceItems = (modalProps.items as ServiceConnectionItem[]).filter(
			(item) => item.kind === 'service',
		);
		const browserItem = serviceItems.find((item) => item.serviceId === 'browser-use');
		const computerItem = serviceItems.find((item) => item.serviceId === 'computer-use');

		expect(browserItem).toBeDefined();
		expect(computerItem).toBeDefined();
		emitModalEvent('onUpdate:detailItem', browserItem);
		emitModalEvent('onUpdate:detailItem', computerItem);

		expect(browserTelemetryMock.trackModalOpened).toHaveBeenCalledWith('tools_modal');
		expect(computerTelemetryMock.trackModalOpened).toHaveBeenCalledWith(false, 'tools_modal');
	});
});
