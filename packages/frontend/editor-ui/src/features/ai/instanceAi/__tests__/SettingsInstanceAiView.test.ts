import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsInstanceAiView from '../views/SettingsInstanceAiView.vue';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { FrontendModuleSettings } from '@n8n/api-types';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		addEventListener: vi.fn(),
	}),
}));

vi.mock('../instanceAi.settings.api', () => ({
	fetchSettings: vi.fn().mockResolvedValue(null),
	updateSettings: vi.fn(),
	fetchPreferences: vi.fn().mockResolvedValue({
		credentialId: null,
		credentialType: null,
		credentialName: null,
		modelName: 'gpt-4',
		localGatewayDisabled: false,
	}),
	updatePreferences: vi.fn(),
	fetchModelCredentials: vi.fn().mockResolvedValue([]),
	fetchServiceCredentials: vi.fn().mockResolvedValue([]),
}));

vi.mock('../instanceAi.api', () => ({
	createGatewayLink: vi.fn(),
	getGatewayStatus: vi.fn(),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(true),
}));

const { mcpConnectionsExperimentMock, computerUseExperimentMock, browserUseExperimentMock } =
	vi.hoisted(() => ({
		mcpConnectionsExperimentMock: vi.fn(),
		browserUseExperimentMock: vi.fn(),
		computerUseExperimentMock: vi.fn(),
	}));

vi.mock('@/experiments/instanceAiMcpConnections', () => ({
	useInstanceAiMcpConnectionsExperiment: mcpConnectionsExperimentMock,
}));

vi.mock('@/experiments/instanceAiBrowserUse', () => ({
	useInstanceAiBrowserUseExperiment: browserUseExperimentMock,
}));

vi.mock('@/experiments/instanceAiComputerUse', () => ({
	useInstanceAiComputerUseExperiment: computerUseExperimentMock,
}));

function makeStub(name: string) {
	return { template: `<div data-test-stub="${name}" />` };
}

const renderComponent = createComponentRenderer(SettingsInstanceAiView, {
	global: {
		stubs: {
			ModelSection: makeStub('ModelSection'),
			SandboxSection: makeStub('SandboxSection'),
			SearchSection: makeStub('SearchSection'),
			AdvancedSection: makeStub('AdvancedSection'),
			// jsdom can't drive element-plus's ElSwitch (it touches a null input ref),
			// so stub it with a button that emits the toggled value.
			ElSwitch: {
				props: ['modelValue', 'disabled'],
				template:
					'<button type="button" role="switch" :data-test-id="$attrs[\'data-test-id\']" :aria-checked="!!modelValue" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)" />',
			},
		},
	},
});

function setModuleSettings(
	settingsStore: ReturnType<typeof useSettingsStore>,
	instanceAi: FrontendModuleSettings['instance-ai'],
) {
	settingsStore.moduleSettings = { 'instance-ai': instanceAi };
}

const defaultModuleSettings: NonNullable<FrontendModuleSettings['instance-ai']> = {
	enabled: true,
	localGatewayDisabled: false,
	browserUseEnabled: true,
	proxyEnabled: false,
	cloudManaged: false,
	sandboxEnabled: true,
	workflowBuilderAvailable: true,
	sandboxUnavailableReason: null,
	runDebugEnabled: false,
};

describe('SettingsInstanceAiView', () => {
	let store: ReturnType<typeof useInstanceAiSettingsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		mcpConnectionsExperimentMock.mockReturnValue({ isFeatureEnabled: ref(true) });
		browserUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(true) });
		computerUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(true) });
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiSettingsStore();
		settingsStore = useSettingsStore();
		setModuleSettings(settingsStore, { ...defaultModuleSettings });
		store.$patch({
			settings: {
				enabled: true,
				subAgentMaxSteps: 10,
				permissions: {},
				mcpServers: '',
				mcpAccessEnabled: true,
				sandboxEnabled: false,
				sandboxProvider: 'n8n-sandbox',
				sandboxImage: '',
				sandboxTimeout: 60,
				daytonaCredentialId: null,
				n8nSandboxCredentialId: null,
				searchCredentialId: null,
				localGatewayDisabled: false,
			},
		});
	});

	function queryStub(container: Element, name: string) {
		return container.querySelector(`[data-test-stub="${name}"]`);
	}

	describe('section visibility — self-hosted (no proxy, no cloud)', () => {
		it('shows Model section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'ModelSection')).not.toBeNull();
		});

		it('shows Sandbox section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'SandboxSection')).not.toBeNull();
		});

		it('shows Search section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'SearchSection')).not.toBeNull();
		});

		it('shows Advanced section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'AdvancedSection')).not.toBeNull();
		});
	});

	describe('section visibility — proxy enabled (non-cloud)', () => {
		beforeEach(() => {
			setModuleSettings(settingsStore, { ...defaultModuleSettings, proxyEnabled: true });
		});

		it('hides Model section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'ModelSection')).toBeNull();
		});

		it('hides Sandbox section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'SandboxSection')).toBeNull();
		});

		it('hides Search section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'SearchSection')).toBeNull();
		});

		it('shows Advanced section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'AdvancedSection')).not.toBeNull();
		});
	});

	describe('section visibility — cloud managed (proxy disabled)', () => {
		beforeEach(() => {
			setModuleSettings(settingsStore, {
				...defaultModuleSettings,
				proxyEnabled: false,
				cloudManaged: true,
			});
		});

		it('hides Model section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'ModelSection')).toBeNull();
		});

		it('hides Sandbox section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'SandboxSection')).toBeNull();
		});

		it('hides Advanced section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'AdvancedSection')).toBeNull();
		});
	});

	describe('section visibility — cloud managed', () => {
		beforeEach(() => {
			setModuleSettings(settingsStore, {
				...defaultModuleSettings,
				proxyEnabled: true,
				cloudManaged: true,
			});
		});

		it('hides Model section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'ModelSection')).toBeNull();
		});

		it('hides Sandbox section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'SandboxSection')).toBeNull();
		});

		it('hides Search section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'SearchSection')).toBeNull();
		});

		it('hides Advanced section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'AdvancedSection')).toBeNull();
		});

		it('shows Permissions section', () => {
			const { getByText } = renderComponent();
			expect(getByText('settings.n8nAgent.permissions.title')).toBeVisible();
		});

		it('shows Enable toggle', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-enable-toggle')).toBeVisible();
		});
	});

	describe('isEnabled fallback for non-admin users', () => {
		it('falls back to moduleSettings when store.settings is null', () => {
			store.$patch({ settings: null });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: true });

			const { getByText } = renderComponent();
			// When enabled, the local gateway section should render
			expect(getByText('settings.n8nAgent.permissions.title')).toBeVisible();
		});

		it('hides content when disabled via moduleSettings fallback', () => {
			store.$patch({ settings: null });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });

			const { queryByText } = renderComponent();
			expect(queryByText('settings.n8nAgent.permissions.title')).toBeNull();
		});
	});

	describe('Browser use settings', () => {
		it('shows the browser use toggle when the experiment is enabled', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-browser-use-toggle')).toBeVisible();
		});

		it('hides the browser use toggle when the experiment is disabled', () => {
			browserUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('n8n-agent-browser-use-toggle')).toBeNull();
		});
	});

	describe('Computer use settings', () => {
		it('shows the computer use toggle when the experiment is enabled', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-computer-use-toggle')).toBeVisible();
		});

		it('hides the computer use toggle when the experiment is disabled', () => {
			computerUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('n8n-agent-computer-use-toggle')).toBeNull();
		});
	});

	describe('MCP servers settings', () => {
		it('renders the MCP access toggle for admins', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-mcp-access-toggle')).toBeVisible();
		});

		it('persists a change to the MCP access toggle', async () => {
			const setField = vi.spyOn(store, 'setField');
			const save = vi.spyOn(store, 'save').mockResolvedValue();
			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-mcp-access-toggle'));

			expect(setField).toHaveBeenCalledWith('mcpAccessEnabled', false);
			expect(save).toHaveBeenCalled();
		});

		it('shows the Execute MCP tools permission when MCP access is enabled', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-permission-executeMcpTool')).toBeVisible();
		});

		it('hides the Execute MCP tools permission when MCP access is disabled', () => {
			store.$patch({ settings: { ...store.settings!, mcpAccessEnabled: false } });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('n8n-agent-permission-executeMcpTool')).toBeNull();
		});

		it('hides the MCP settings card when the connections experiment is disabled', () => {
			mcpConnectionsExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('n8n-agent-mcp-access-toggle')).toBeNull();
			expect(queryByTestId('n8n-agent-permission-executeMcpTool')).toBeNull();
		});
	});
});
