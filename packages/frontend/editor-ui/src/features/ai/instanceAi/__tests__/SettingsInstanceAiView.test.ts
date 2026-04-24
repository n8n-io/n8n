import { describe, it, expect, vi, beforeEach } from 'vitest';
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

function makeStub(name: string) {
	return { template: `<div data-test-stub="${name}" />` };
}

const renderComponent = createComponentRenderer(SettingsInstanceAiView, {
	global: {
		stubs: {
			ModelSection: makeStub('ModelSection'),
			SandboxSection: makeStub('SandboxSection'),
			MemorySection: makeStub('MemorySection'),
			SearchSection: makeStub('SearchSection'),
			AdvancedSection: makeStub('AdvancedSection'),
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
	proxyEnabled: false,
	optinModalDismissed: true,
	cloudManaged: false,
};

describe('SettingsInstanceAiView', () => {
	let store: ReturnType<typeof useInstanceAiSettingsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiSettingsStore();
		settingsStore = useSettingsStore();
		setModuleSettings(settingsStore, { ...defaultModuleSettings });
		store.$patch({
			settings: {
				enabled: true,
				lastMessages: 20,
				embedderModel: '',
				semanticRecallTopK: 5,
				subAgentMaxSteps: 10,
				browserMcp: false,
				permissions: {},
				mcpServers: '',
				sandboxEnabled: false,
				sandboxProvider: '',
				sandboxImage: '',
				sandboxTimeout: 60,
				daytonaCredentialId: null,
				n8nSandboxCredentialId: null,
				searchCredentialId: null,
				localGatewayDisabled: false,
				optinModalDismissed: true,
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

		it('shows Memory section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'MemorySection')).not.toBeNull();
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

		it('shows Memory section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'MemorySection')).not.toBeNull();
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

		it('hides Memory section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'MemorySection')).toBeNull();
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

		it('hides Memory section', () => {
			const { container } = renderComponent();
			expect(queryStub(container, 'MemorySection')).toBeNull();
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
});
