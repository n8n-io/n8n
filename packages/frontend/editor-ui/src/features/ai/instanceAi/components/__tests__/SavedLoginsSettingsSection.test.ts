import type { FrontendModuleSettings } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import { fetchSavedLogins } from '../../instanceAi.api';
import SavedLoginsSettingsSection from '../SavedLoginsSettingsSection.vue';

const { route, routerReplace, isCloudBrowserExperimentEnabled } = vi.hoisted(() => ({
	route: { query: {} as Record<string, string | undefined> },
	routerReplace: vi.fn(),
	isCloudBrowserExperimentEnabled: { value: true },
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => route,
	useRouter: () => ({ replace: routerReplace }),
}));
vi.mock('@/experiments/instanceAiCloudBrowser/useInstanceAiCloudBrowserExperiment', () => ({
	useInstanceAiCloudBrowserExperiment: () => ({
		isEnabled: ref(isCloudBrowserExperimentEnabled.value),
	}),
}));
vi.mock('../../instanceAi.api', () => ({
	fetchSavedLogins: vi.fn(),
	deleteSavedLogin: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));

const renderComponent = createComponentRenderer(SavedLoginsSettingsSection);

type InstanceAiModuleSettings = NonNullable<FrontendModuleSettings['instance-ai']>;

const instanceAiSettings: InstanceAiModuleSettings = {
	enabled: true,
	mcpConnectionsAvailable: true,
	browserUseEnabled: true,
	proxyEnabled: false,
	cloudManaged: true,
	sandboxEnabled: true,
	workflowBuilderAvailable: true,
	sandboxUnavailableReason: null,
	runDebugEnabled: false,
	workflowSuggestionsEnabled: false,
	assistantAgentEnabled: false,
	cloudBrowserEnabled: true,
};

let settingsStore: ReturnType<typeof useSettingsStore>;

function setAvailability({
	aiGateway = true,
	cloudUbb = true,
	instanceAi = {},
}: {
	aiGateway?: boolean;
	cloudUbb?: boolean;
	instanceAi?: Partial<InstanceAiModuleSettings> | null;
} = {}) {
	settingsStore.settings.aiGateway = {
		budget: 0,
		...settingsStore.settings.aiGateway,
		enabled: aiGateway,
		cloudUbbEnabled: cloudUbb,
	};
	settingsStore.moduleSettings =
		instanceAi === null ? {} : { 'instance-ai': { ...instanceAiSettings, ...instanceAi } };
}

async function render() {
	const rendered = renderComponent();
	await flushPromises();
	return rendered;
}

describe('SavedLoginsSettingsSection', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		settingsStore = useSettingsStore();
		setAvailability();
		isCloudBrowserExperimentEnabled.value = true;
		route.query = {};
		routerReplace.mockReset();
		vi.mocked(fetchSavedLogins).mockReset().mockResolvedValue({ savedLogins: [] });
	});

	describe('visibility', () => {
		it('shows when the cloud browser is available', async () => {
			await render();

			expect(screen.getByTestId('saved-logins-section')).toHaveTextContent('Saved logins');
			expect(screen.getByTestId('saved-logins-open')).toBeInTheDocument();
		});

		it('hides on a multi-main instance', async () => {
			settingsStore.settings.isMultiMain = true;
			await render();

			expect(screen.queryByTestId('saved-logins-section')).not.toBeInTheDocument();
		});

		it('hides when the cloud browser rollout flag is off', async () => {
			isCloudBrowserExperimentEnabled.value = false;
			await render();

			expect(screen.queryByTestId('saved-logins-section')).not.toBeInTheDocument();
		});

		it.each([
			['the AI gateway is off', { aiGateway: false }],
			['the Cloud usage-based billing is off', { cloudUbb: false }],
			['n8n Assistant is turned off', { instanceAi: { enabled: false } }],
			['the admin turned the cloud browser off', { instanceAi: { cloudBrowserEnabled: false } }],
			['the cloud browser setting is missing', { instanceAi: { cloudBrowserEnabled: undefined } }],
			['the n8n Assistant module settings are missing', { instanceAi: null }],
		])('hides when %s', async (_, availability) => {
			setAvailability(availability);
			await render();

			expect(screen.queryByTestId('saved-logins-section')).not.toBeInTheDocument();
		});
	});

	describe('dialog', () => {
		it('starts closed and does not load the saved logins', async () => {
			await render();

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			expect(fetchSavedLogins).not.toHaveBeenCalled();
		});

		it('opens the saved logins when the user clicks the button', async () => {
			await render();

			await userEvent.click(screen.getByTestId('saved-logins-open'));
			await flushPromises();

			expect(
				await screen.findByRole('dialog', { name: 'Saved browser logins' }),
			).toBeInTheDocument();
			expect(fetchSavedLogins).toHaveBeenCalledOnce();
		});

		it('opens at once from the query and removes it from the address', async () => {
			route.query = { savedLogins: 'open', tab: 'profile' };
			await render();

			expect(
				await screen.findByRole('dialog', { name: 'Saved browser logins' }),
			).toBeInTheDocument();
			expect(routerReplace).toHaveBeenCalledExactlyOnceWith({ query: { tab: 'profile' } });
		});

		it('does not change the address without the query', async () => {
			route.query = { tab: 'profile' };
			await render();

			expect(routerReplace).not.toHaveBeenCalled();
		});
	});
});
