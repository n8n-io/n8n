import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import ConnectionsCard from '../ConnectionsCard.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const { mcpExperimentMock, browserUseExperimentMock, computerUseExperimentMock } = vi.hoisted(
	() => ({
		mcpExperimentMock: vi.fn(),
		browserUseExperimentMock: vi.fn(),
		computerUseExperimentMock: vi.fn(),
	}),
);

vi.mock('@/experiments/instanceAiMcpConnections', () => ({
	useInstanceAiMcpConnectionsExperiment: mcpExperimentMock,
}));

vi.mock('@/experiments/instanceAiBrowserUse', () => ({
	useInstanceAiBrowserUseExperiment: browserUseExperimentMock,
}));

vi.mock('@/experiments/instanceAiComputerUse', () => ({
	useInstanceAiComputerUseExperiment: computerUseExperimentMock,
}));

const settingsStoreMock = vi.fn();
vi.mock('../../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => settingsStoreMock(),
}));

vi.mock('../../instanceAiMcp.store', () => ({
	useInstanceAiMcpStore: () => ({
		connections: [],
		fetchConnections: vi.fn(),
		disconnect: vi.fn(),
	}),
}));

vi.mock('../../instanceAiMcp.telemetry', () => ({
	useInstanceAiMcpTelemetry: () => ({
		trackAddMenuMcpSelected: vi.fn(),
		trackModalOpened: vi.fn(),
		trackSettingsOpened: vi.fn(),
	}),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModal: vi.fn(),
		openModalWithData: vi.fn(),
		appliedTheme: 'light',
	}),
}));

const COMPUTER_USE_CONNECTION = {
	type: 'computer-use' as const,
	name: 'computer-use-row',
	subtitle: 'subtitle',
	status: 'disconnected' as const,
};

const BROWSER_USE_CONNECTION = {
	type: 'browser-use' as const,
	name: 'browser-use-row',
	subtitle: 'subtitle',
	status: 'disconnected' as const,
};

function makeSettingsStore(overrides: Record<string, unknown> = {}) {
	return {
		connections: [COMPUTER_USE_CONNECTION, BROWSER_USE_CONNECTION],
		settings: { mcpAccessEnabled: false },
		isLocalGatewayDisabledByAdmin: false,
		isLocalGatewayDisabled: false,
		isBrowserUseEnabledByAdmin: true,
		gatewayStatusLoaded: true,
		browserStatusLoaded: true,
		fetch: vi.fn(),
		persistLocalGatewayPreference: vi.fn(),
		disconnectComputerUse: vi.fn(),
		removeComputerUse: vi.fn(),
		disconnectBrowserUse: vi.fn(),
		...overrides,
	};
}

const renderComponent = createComponentRenderer(ConnectionsCard, {
	global: {
		stubs: {
			ConnectionRow: {
				props: ['name'],
				template: '<div data-test-stub="connection-row">{{ name }}</div>',
			},
		},
	},
});

describe('ConnectionsCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		mcpExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });
		computerUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(true) });
		browserUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(true) });
		settingsStoreMock.mockReturnValue(makeSettingsStore());
	});

	it('renders the browser use row when the experiment is enabled', () => {
		const { getByText } = renderComponent();
		expect(getByText('browser-use-row')).toBeVisible();
	});

	it('renders the computer use row when the experiment is enabled', () => {
		const { getByText } = renderComponent();
		expect(getByText('computer-use-row')).toBeVisible();
	});

	describe('when browser use experiment is disabled', () => {
		beforeEach(() => {
			browserUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });
		});

		it('hides the browser use row', () => {
			const { queryByText } = renderComponent();
			expect(queryByText('browser-use-row')).toBeNull();
		});

		it('keeps other connection rows visible', () => {
			const { getByText } = renderComponent();
			expect(getByText('computer-use-row')).toBeVisible();
		});
	});

	describe('when computer use experiment is disabled', () => {
		beforeEach(() => {
			computerUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });
		});

		it('hides the computer use row', () => {
			const { queryByText } = renderComponent();
			expect(queryByText('computer-use-row')).toBeNull();
		});

		it('hides the empty-state CTA and shows the simplified title', () => {
			settingsStoreMock.mockReturnValue(
				makeSettingsStore({ connections: [COMPUTER_USE_CONNECTION] }),
			);
			const { queryByTestId, getByText } = renderComponent();
			expect(queryByTestId('instance-ai-connections-empty-cta')).toBeNull();
			expect(getByText('instanceAi.connections.empty.titleNoComputerUse')).toBeVisible();
		});

		it('omits computer use from the add menu', () => {
			const { queryByTestId } = renderComponent();
			expect(queryByTestId('instance-ai-connections-add')).toBeNull();
		});
	});

	it('shows the empty-state CTA when the experiment is enabled but no connections exist', () => {
		settingsStoreMock.mockReturnValue(makeSettingsStore({ connections: [] }));
		const { getByTestId } = renderComponent();
		expect(getByTestId('instance-ai-connections-empty-cta')).toBeVisible();
	});

	describe('card visibility', () => {
		it('hides the entire card when no channel is enabled', () => {
			browserUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });
			computerUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });
			const { queryByText } = renderComponent();
			expect(queryByText('instanceAi.connections.title')).toBeNull();
		});

		it('hides the card when computer use is the only enabled channel but the local gateway is disabled by admin', () => {
			browserUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });
			settingsStoreMock.mockReturnValue(makeSettingsStore({ isLocalGatewayDisabledByAdmin: true }));
			const { queryByText } = renderComponent();
			expect(queryByText('instanceAi.connections.title')).toBeNull();
		});

		it('shows the card via MCP even when both singleton experiments are disabled', () => {
			browserUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });
			computerUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });
			mcpExperimentMock.mockReturnValue({ isFeatureEnabled: ref(true) });
			settingsStoreMock.mockReturnValue(
				makeSettingsStore({ settings: { mcpAccessEnabled: true } }),
			);
			const { getByText } = renderComponent();
			expect(getByText('instanceAi.connections.title')).toBeVisible();
		});
	});
});
