import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type InstanceAiAdminSettingsResponse,
} from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	fetchSettings,
	updateSettings,
	verifySandbox,
} from '@/features/ai/instanceAi/instanceAi.settings.api';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';
import { getAgentsSettings, updateAgentsSettings } from '../composables/useAgentApi';
import SettingsAgentsView from '../views/SettingsAgentsView.vue';

const { showError, showMessage } = vi.hoisted(() => ({
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('../composables/useAgentApi', () => ({
	getAgentsSettings: vi.fn(),
	updateAgentsSettings: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError, showMessage }) }));
vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));
vi.mock('@/app/utils/rbac/permissions', () => ({ hasPermission: () => true }));
vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ addEventListener: vi.fn() }),
}));
vi.mock('@/features/ai/instanceAi/instanceAi.settings.api', () => ({
	fetchSettings: vi.fn(),
	updateSettings: vi.fn(),
	fetchPreferences: vi.fn().mockResolvedValue({}),
	fetchServiceCredentials: vi.fn().mockResolvedValue([]),
	fetchInstanceModelCredentials: vi.fn().mockResolvedValue([]),
	verifySandbox: vi.fn(),
}));

function sharedSettings(
	overrides: Partial<InstanceAiAdminSettingsResponse> = {},
): InstanceAiAdminSettingsResponse {
	return {
		enabled: false,
		permissions: { ...DEFAULT_INSTANCE_AI_PERMISSIONS },
		mcpAccessEnabled: true,
		sandboxEnabled: false,
		sandboxProvider: 'n8n-sandbox',
		daytonaCredentialId: null,
		n8nSandboxCredentialId: null,
		searchCredentialId: null,
		modelCredentialId: null,
		modelName: null,
		modelEnvConfigured: false,
		sandboxEnvConfigured: false,
		searchEnvConfigured: false,
		searchDisabled: false,
		n8nSandboxServiceUrl: null,
		envManaged: {
			model: { provider: false, apiKey: false, baseUrl: false, model: false },
			sandbox: { provider: false, serviceUrl: false, apiKey: false },
			search: { provider: false, apiKey: false, url: false },
		},
		localGatewayDisabled: false,
		browserUseEnabled: false,
		...overrides,
	};
}

const render = createComponentRenderer(SettingsAgentsView);

beforeEach(() => {
	createTestingPinia({ stubActions: false });
	vi.clearAllMocks();
	useSettingsStore().$patch({
		settings: { activeModules: ['agents', 'instance-ai'] },
		moduleSettings: { 'instance-ai': { enabled: false, proxyEnabled: false, cloudManaged: false } },
	});
	useSettingsStore().moduleSettings.agents = {
		enabled: false,
		modules: [],
		knowledgeBaseEnabled: false,
		proxyEnabled: false,
	};
	vi.mocked(getAgentsSettings).mockResolvedValue({ enabled: false });
	vi.mocked(fetchSettings).mockResolvedValue(sharedSettings());
	vi.mocked(verifySandbox).mockResolvedValue({ ok: true });
	vi.spyOn(useCredentialsStore(), 'fetchCredentialTypes').mockResolvedValue(undefined);
	vi.spyOn(useSettingsStore(), 'getModuleSettings').mockResolvedValue(undefined);
});

it('loads the disabled setting and saves enable and disable choices', async () => {
	vi.mocked(updateAgentsSettings).mockImplementation(async (_context, settings) => settings);
	const { findByRole } = render();
	const toggle = await findByRole('switch', { name: 'Enable Agents' });
	expect(toggle).toHaveAttribute('aria-checked', 'false');

	await fireEvent.click(toggle);
	await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
	expect(updateAgentsSettings).toHaveBeenLastCalledWith(expect.anything(), { enabled: true });
	expect(useSettingsStore().moduleSettings.agents?.enabled).toBe(true);

	await fireEvent.click(toggle);
	await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
	expect(updateAgentsSettings).toHaveBeenLastCalledWith(expect.anything(), { enabled: false });
	expect(useSettingsStore().moduleSettings.agents?.enabled).toBe(false);
});

it('keeps the saved choice when the update fails', async () => {
	const error = new Error('Save failed');
	vi.mocked(updateAgentsSettings).mockRejectedValue(error);
	const { findByRole } = render();
	const toggle = await findByRole('switch', { name: 'Enable Agents' });

	await fireEvent.click(toggle);
	await waitFor(() =>
		expect(showError).toHaveBeenCalledWith(error, 'Could not save Agents settings'),
	);
	expect(toggle).toHaveAttribute('aria-checked', 'false');
	expect(useSettingsStore().moduleSettings.agents?.enabled).toBe(false);
});

it('configures the shared sandbox while Assistant and Agents are off', async () => {
	vi.mocked(updateSettings).mockResolvedValue(
		sharedSettings({
			sandboxEnabled: true,
			n8nSandboxCredentialId: 'shared-sandbox',
			n8nSandboxServiceUrl: 'http://sandbox:3200',
		}),
	);
	const { findByRole, findByTestId, getByTestId, queryByTestId } = render();
	await fireEvent.click(await findByRole('button', { name: 'Add sandbox' }));
	await fireEvent.click(await findByTestId('assistant-sandbox-n8n-sandbox'));
	const url = getByTestId('assistant-sandbox-url');
	const key = getByTestId('n8n-agent-sandbox-api-key-input');
	await fireEvent.update(url.querySelector('input') ?? url, 'http://sandbox:3200');
	await fireEvent.update(key.querySelector('input') ?? key, 'test-sandbox-key');
	await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-save'));

	await waitFor(() => expect(queryByTestId('n8n-agent-sandbox-dialog-save')).toBeNull());
	expect(verifySandbox).toHaveBeenCalledWith(expect.anything(), {
		provider: 'n8n-sandbox',
		connection: {
			type: 'httpHeaderAuth',
			data: { name: 'x-api-key', value: 'test-sandbox-key' },
		},
		serviceUrl: 'http://sandbox:3200',
	});
	expect(updateSettings).toHaveBeenCalledWith(expect.anything(), {
		sandboxConnection: {
			type: 'httpHeaderAuth',
			data: { name: 'x-api-key', value: 'test-sandbox-key' },
		},
		sandboxProvider: 'n8n-sandbox',
		sandboxEnabled: true,
		n8nSandboxServiceUrl: 'http://sandbox:3200',
	});
	expect(useSettingsStore().moduleSettings['instance-ai']?.enabled).toBe(false);
	expect(updateAgentsSettings).not.toHaveBeenCalled();
});

it('shows Retry after a failed sandbox reload with cached settings', async () => {
	useInstanceAiSettingsStore().settings = sharedSettings({
		sandboxEnabled: true,
		n8nSandboxCredentialId: 'cached-sandbox',
		n8nSandboxServiceUrl: 'http://sandbox:3200',
	});
	vi.mocked(fetchSettings).mockRejectedValueOnce(new Error('Load failed'));
	const { findByRole, findByTestId, queryByTestId, queryByRole } = render();
	const retry = await findByRole('button', { name: 'Retry' });
	expect(queryByTestId('n8n-agent-sandbox-row')).not.toBeInTheDocument();

	vi.mocked(fetchSettings).mockResolvedValue(sharedSettings());
	await fireEvent.click(retry);
	expect(await findByTestId('n8n-agent-sandbox-row')).toBeInTheDocument();
	expect(await findByRole('button', { name: 'Add sandbox' })).toBeInTheDocument();
	expect(queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
});

it.each(['cloud', 'environment'] as const)(
	'keeps %s-managed connections read-only',
	async (source) => {
		if (source === 'cloud') {
			useSettingsStore().$patch({ settings: { deployment: { type: 'cloud' } } });
		} else {
			vi.mocked(fetchSettings).mockResolvedValue(
				sharedSettings({ sandboxEnabled: true, sandboxEnvConfigured: true }),
			);
		}
		const { findByText, getByTestId, queryByRole } = render();
		await findByText(
			source === 'cloud' ? 'Managed by n8n Cloud' : /Managed by environment variables/,
		);
		expect(queryByRole('button', { name: 'Add sandbox' })).not.toBeInTheDocument();
		expect(queryByRole('button', { name: /Configure/ })).not.toBeInTheDocument();
		if (source === 'cloud') {
			expect(fetchSettings).not.toHaveBeenCalled();
		} else {
			expect(getByTestId('n8n-agent-sandbox-env-value')).toHaveTextContent(
				'Found in server configuration',
			);
		}
	},
);

it('shows server setup guidance when the Assistant module is not loaded', async () => {
	useSettingsStore().$patch({ settings: { activeModules: ['agents'] } });
	const { findByText, queryByRole } = render();
	await findByText(/The Assistant module is disabled/);
	expect(fetchSettings).not.toHaveBeenCalled();
	expect(queryByRole('button', { name: 'Add sandbox' })).not.toBeInTheDocument();
});
