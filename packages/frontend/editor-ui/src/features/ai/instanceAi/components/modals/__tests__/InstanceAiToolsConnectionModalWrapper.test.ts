import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiToolsConnectionModalWrapper from '../InstanceAiToolsConnectionModalWrapper.vue';

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

const { mockUpdateConnection } = vi.hoisted(() => ({
	mockUpdateConnection: vi.fn(),
}));
vi.mock('../../../instanceAiMcp.store', () => ({
	useInstanceAiMcpStore: () => ({
		connections: [],
		catalog: [],
		connectionsByServerSlug: new Map(),
		connectionToolsById: new Map(),
		fetchCatalogLazy: vi.fn(),
		fetchConnections: vi.fn(),
		fetchConnectionToolsLazy: vi.fn(),
		connect: vi.fn(),
		updateConnection: mockUpdateConnection,
		disconnect: vi.fn(),
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

const ToolsConnectionModalStub = defineComponent({
	name: 'ToolsConnectionModal',
	emits: ['save'],
	setup(_, { emit }) {
		function saveSettings() {
			emit(
				'save',
				{ id: 'conn-1' },
				{
					inclusionMode: 'selected',
					selectedTools: ['search'],
					excludedTools: [],
				},
			);
		}

		return { saveSettings };
	},
	template: '<button data-test-id="save-settings" @click="saveSettings">save</button>',
});

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
		mockUpdateConnection.mockResolvedValue({ serverSlug: 'linear' });
	});

	it('tracks tool filter settings after a successful save', async () => {
		const { getByTestId } = renderComponent();

		await fireEvent.click(getByTestId('save-settings'));
		await flushPromises();

		expect(mockUpdateConnection).toHaveBeenCalledWith('conn-1', {
			inclusionMode: 'selected',
			selectedTools: ['search'],
			excludedTools: [],
		});
		expect(telemetryMock.trackToolFilterSettingsUpdated).toHaveBeenCalledWith('linear', 'selected');
	});
});
