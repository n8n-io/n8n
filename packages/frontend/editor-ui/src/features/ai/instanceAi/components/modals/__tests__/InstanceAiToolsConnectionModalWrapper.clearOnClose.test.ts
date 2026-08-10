/**
 * The clear-on-close, against the real `ui.store` rather than a mock of it.
 *
 * The sibling suite asserts that unmounting calls `setModalData`, which a mocked
 * store can see. What it cannot see is whether the clear survives: `modalsById`
 * resolves a definition-backed key to a *copy*, so a write in place looks correct
 * in the same tick and is gone by the next open. That is the whole failure mode,
 * so this suite mounts against a real store and asserts what the user gets on the
 * second open — the list, not the previously-opened server's settings view.
 */
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { defineComponent } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';

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

const SERVER = {
	slug: 'linear',
	title: 'Linear',
	tagline: 'Issue tracking',
	description: 'Issue tracking',
	credentialType: 'linearApi',
	tools: [],
	icons: [],
	isOfficial: true,
	version: '1.0.0',
	websiteUrl: 'https://linear.app',
};
const CONNECTION = { id: 'conn-1', serverSlug: 'linear', credentialId: 'cred-1' };

vi.mock('../../../instanceAiMcp.store', () => ({
	useInstanceAiMcpStore: () => ({
		connections: [CONNECTION],
		catalog: [SERVER],
		connectionsByServerSlug: new Map([['linear', [CONNECTION]]]),
		connectionToolsById: new Map(),
		fetchCatalogLazy: vi.fn(),
		fetchConnections: vi.fn(),
		fetchConnectionToolsLazy: vi.fn(),
		connect: vi.fn(),
		updateConnection: vi.fn(),
		disconnect: vi.fn(),
	}),
}));

vi.mock('../../../composables/useMcpServerConnect', () => ({
	useMcpServerConnect: () => ({
		connectServer: vi.fn().mockResolvedValue(null),
		connectWithCredential: vi.fn().mockResolvedValue(null),
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

vi.mock('../../../instanceAiMcp.telemetry', () => ({
	useInstanceAiMcpTelemetry: () => ({
		trackToolFilterSettingsUpdated: vi.fn(),
		trackFirstCredentialConnectionStart: vi.fn(),
		trackCredentialDropdownOpened: vi.fn(),
		trackExistingCredentialSelected: vi.fn(),
		trackNewCredentialConnectionStart: vi.fn(),
		trackToolsListOpened: vi.fn(),
		trackSettingsOpened: vi.fn(),
	}),
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
	useToast: () => ({ showMessage: vi.fn(), showError: vi.fn() }),
}));

/** Records the two props that decide what the user is looking at. */
const { seen, ToolsConnectionModalStub } = vi.hoisted(() => {
	const seen: Array<{ detailItemId: string | null; hideBackButton: boolean }> = [];
	return { seen, ToolsConnectionModalStub: { seen } };
});

vi.mock('@/features/shared/toolsConnection/ToolsConnectionModal.vue', () => ({
	default: defineComponent({
		props: {
			detailItem: { type: Object, default: null },
			hideBackButton: { type: Boolean, default: false },
		},
		setup(props) {
			ToolsConnectionModalStub.seen.push({
				detailItemId: (props.detailItem?.id as string) ?? null,
				hideBackButton: props.hideBackButton,
			});
			return () => null;
		},
	}),
}));

const renderComponent = createComponentRenderer(InstanceAiToolsConnectionModalWrapper, {
	props: { modalName: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY },
});

describe('InstanceAiToolsConnectionModalWrapper clear-on-close', () => {
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		seen.length = 0;
	});

	// 1. Settings on a connected MCP server  → openModalWithData({ connectionId })
	// 2. Close it                            → ModalRoot has no keepAlive, so unmount
	// 3. The tools list                      → openModal(), no data
	// Expected on step 3: the list. Before the fix the clear was discarded and the
	// user landed back in conn-1's settings view with the back button hidden.
	it('opens on the list after a direct-connection open was closed', async () => {
		const uiStore = useUIStore();

		uiStore.openModalWithData({
			name: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
			data: { connectionId: 'conn-1' },
		});
		const settingsOpen = renderComponent({ pinia });

		expect(seen.at(-1)).toEqual({ detailItemId: 'conn-1', hideBackButton: true });

		uiStore.closeModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
		settingsOpen.unmount();

		uiStore.openModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
		renderComponent({ pinia });

		expect(seen.at(-1)).toEqual({ detailItemId: null, hideBackButton: false });
	});

	it('leaves the data alone while the modal is open', () => {
		const uiStore = useUIStore();

		uiStore.openModalWithData({
			name: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
			data: { connectionId: 'conn-1' },
		});
		renderComponent({ pinia });

		expect(uiStore.modalsById[INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY].data).toEqual({
			connectionId: 'conn-1',
		});
	});
});
