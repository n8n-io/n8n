import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';
import SettingsInstanceAiView from '../views/SettingsInstanceAiView.vue';
import ConnectionDialog from '../components/settings/ConnectionDialog.vue';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { fetchSettings } from '../instanceAi.settings.api';
import type { FrontendModuleSettings } from '@n8n/api-types';
import type { ICredentialType } from 'n8n-workflow';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
		credText: () => ({
			inputLabelDisplayName: (parameter: { displayName: string }) => parameter.displayName,
			inputLabelDescription: () => '',
			hint: () => '',
		}),
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
	fetchServiceCredentials: vi.fn().mockResolvedValue([]),
	fetchInstanceModelCredentials: vi.fn().mockResolvedValue([]),
}));

vi.mock('../instanceAi.api', () => ({
	createGatewayLink: vi.fn(),
	getGatewayStatus: vi.fn(),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(true),
}));

const {
	mcpConnectionsExperimentMock,
	computerUseExperimentMock,
	browserUseExperimentMock,
	routerPushMock,
} = vi.hoisted(() => ({
	mcpConnectionsExperimentMock: vi.fn(),
	browserUseExperimentMock: vi.fn(),
	computerUseExperimentMock: vi.fn(),
	routerPushMock: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: routerPushMock }),
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

const renderComponent = createComponentRenderer(SettingsInstanceAiView);
const renderConnectionDialog = createComponentRenderer(ConnectionDialog);
const renderModelDialog = ({ props }: { props: Record<string, unknown> }) =>
	renderConnectionDialog({ props: { kind: 'model', ...props } });
const renderSearchDialog = ({ props }: { props: Record<string, unknown> }) =>
	renderConnectionDialog({ props: { kind: 'search', ...props } });

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
	let fetchCredentialTypesSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(fetchSettings).mockResolvedValue(null as never);
		vi.mocked(hasPermission).mockReturnValue(true);
		mcpConnectionsExperimentMock.mockReturnValue({ isFeatureEnabled: ref(true) });
		browserUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(true) });
		computerUseExperimentMock.mockReturnValue({ isFeatureEnabled: ref(true) });
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		fetchCredentialTypesSpy = vi
			.spyOn(useCredentialsStore(), 'fetchCredentialTypes')
			.mockResolvedValue(undefined as never) as unknown as ReturnType<typeof vi.fn>;
		useCredentialsStore().setCredentialTypes([
			{ name: 'openAiApi', displayName: 'OpenAI', properties: [] },
			{ name: 'anthropicApi', displayName: 'Anthropic', properties: [] },
			{
				name: 'daytonaApi',
				displayName: 'Daytona',
				properties: [
					{ displayName: 'API URL', name: 'apiUrl', type: 'string', required: true, default: '' },
					{
						displayName: 'API Key',
						name: 'apiKey',
						type: 'string',
						typeOptions: { password: true },
						required: true,
						default: '',
					},
				],
			},
			{
				name: 'searXngApi',
				displayName: 'SearXNG',
				properties: [
					{ displayName: 'API URL', name: 'apiUrl', type: 'string', required: true, default: '' },
				],
			},
			{
				name: 'braveSearchApi',
				displayName: 'Brave Search',
				properties: [
					{
						displayName: 'API Key',
						name: 'apiKey',
						type: 'string',
						required: true,
						default: '',
					},
				],
				test: { request: { url: '/search' } },
			},
		] satisfies ICredentialType[]);
		store = useInstanceAiSettingsStore();
		settingsStore = useSettingsStore();
		setModuleSettings(settingsStore, { ...defaultModuleSettings });
		store.$patch({
			settings: {
				enabled: true,
				permissions: {},
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
				localGatewayDisabled: false,
			},
		});
	});

	describe('shared connection dialogs', () => {
		it('uses settings actions without onboarding progress', async () => {
			const { findByTestId, getByTestId, queryByTestId } = renderSearchDialog({
				props: { open: true, setup: true },
			});

			await findByTestId('n8n-agent-search-dialog-save');
			expect(getByTestId('n8n-agent-search-dialog-cancel')).toBeVisible();
			expect(getByTestId('n8n-agent-search-dialog-save')).toBeVisible();
			expect(queryByTestId('n8n-agent-search-dialog-step')).toBeNull();
			expect(queryByTestId('n8n-agent-search-dialog-back')).toBeNull();
		});

		it('offers compatible credentials without listing the assigned credential twice', async () => {
			vi.spyOn(useCredentialsStore(), 'getCredentialData').mockResolvedValue({
				data: { apiKey: 'stored-key' },
			} as never);
			store.$patch({
				settings: {
					...store.settings!,
					modelCredentialId: 'assigned-id',
					modelName: 'gpt-5.6-sol',
				},
				instanceModelCredentials: [
					{ id: 'assigned-id', name: 'Current model', type: 'openAiApi' },
					{ id: 'backup-id', name: 'Backup model', type: 'anthropicApi' },
				],
			});

			const { findByTestId, findByText, queryByText } = renderModelDialog({
				props: { open: true },
			});
			const existing = await findByTestId('n8n-agent-model-existing-credential-select');
			await fireEvent.click(existing.querySelector('input')!);

			expect(await findByText('Backup model · Anthropic')).toBeInTheDocument();
			expect(queryByText('Current model · OpenAI')).toBeNull();
		});

		it('does not show an empty credential selector during fresh setup', async () => {
			const { findByTestId, queryByTestId } = renderModelDialog({
				props: { open: true },
			});

			expect(await findByTestId('n8n-agent-model-provider-select')).toBeVisible();
			expect(queryByTestId('n8n-agent-model-existing-credential-select')).toBeNull();
			expect(queryByTestId('assistant-model-base-url')).toBeNull();
		});

		it('does not show the credential selector for only one compatible credential', async () => {
			store.$patch({
				instanceModelCredentials: [{ id: 'only-model', name: 'Only model', type: 'openAiApi' }],
			});

			const { findByTestId, queryByTestId } = renderModelDialog({
				props: { open: true },
			});

			expect(await findByTestId('n8n-agent-model-provider-select')).toBeVisible();
			expect(queryByTestId('n8n-agent-model-existing-credential-select')).toBeNull();
		});

		it('chains missing setup steps while keeping settings-style actions', async () => {
			vi.mocked(store.fetch).mockResolvedValue(undefined);
			vi.mocked(store.verifyModel).mockResolvedValue({ ok: true });
			vi.mocked(store.verifySandbox).mockResolvedValue({ ok: true });
			vi.mocked(store.save).mockImplementation(async () => {
				const draft = { ...store.draft };
				const next = { ...store.settings! };
				if (draft.modelConnection) {
					next.modelCredentialId = 'saved-model';
					next.modelName = draft.modelName ?? null;
				}
				if (draft.sandboxConnection) {
					next.n8nSandboxCredentialId = 'saved-sandbox';
					next.sandboxProvider = 'n8n-sandbox';
					next.sandboxEnabled = true;
					next.n8nSandboxServiceUrl = draft.n8nSandboxServiceUrl ?? null;
				}
				if (draft.searchDisabled !== undefined) next.searchDisabled = draft.searchDisabled;
				store.$patch({ settings: next });
				for (const key of Object.keys(store.draft)) Reflect.deleteProperty(store.draft, key);
				return true;
			});

			const { findByTestId, getByTestId, queryByTestId } = renderComponent();
			await fireEvent.click(getByTestId('n8n-agent-model-add'));
			const modelApiKey = await findByTestId('n8n-agent-model-api-key-input');
			await fireEvent.update(modelApiKey.querySelector('input') ?? modelApiKey, 'model-key');
			expect(queryByTestId('n8n-agent-model-dialog-step')).toBeNull();
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));

			await fireEvent.click(await findByTestId('assistant-sandbox-n8n-sandbox'));
			const sandboxUrl = getByTestId('assistant-sandbox-url');
			await fireEvent.update(
				sandboxUrl.querySelector('input') ?? sandboxUrl,
				'http://sandbox:3200',
			);
			const sandboxApiKey = getByTestId('n8n-agent-sandbox-api-key-input');
			await fireEvent.update(sandboxApiKey.querySelector('input') ?? sandboxApiKey, 'sandbox-key');
			expect(queryByTestId('n8n-agent-sandbox-dialog-step')).toBeNull();
			await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-save'));

			await fireEvent.click(await findByTestId('assistant-search-disabled'));
			expect(queryByTestId('n8n-agent-search-dialog-step')).toBeNull();
			await fireEvent.click(getByTestId('n8n-agent-search-dialog-save'));

			await waitFor(() => expect(queryByTestId('n8n-agent-search-dialog-save')).toBeNull());
			expect(store.settings).toMatchObject({
				modelCredentialId: 'saved-model',
				n8nSandboxCredentialId: 'saved-sandbox',
				searchDisabled: true,
			});
		});
	});

	describe('status row', () => {
		it('renders the enabled status action', () => {
			store.$patch({
				settings: {
					...store.settings!,
					modelCredentialId: 'openai-id',
					modelEnvConfigured: true,
					sandboxEnabled: true,
					sandboxEnvConfigured: true,
					searchDisabled: true,
				},
			});
			const { getByTestId, getByText } = renderComponent();
			expect(getByTestId('n8n-agent-status-menu')).toBeVisible();
			expect(getByText('settings.n8nAgent.status.enabled')).toBeVisible();
		});

		it('shows setup required for a credential-only legacy model assignment', () => {
			store.$patch({
				settings: {
					...store.settings!,
					modelCredentialId: 'openai-id',
					modelName: null,
					sandboxEnvConfigured: true,
				},
			});
			const { getByTestId, getByText } = renderComponent();
			expect(getByTestId('n8n-agent-status-menu')).toBeVisible();
			expect(getByText('settings.n8nAgent.status.setupRequired')).toBeVisible();
		});

		it('shows an enable button with dimmed sections when disabled but configured', () => {
			store.$patch({
				settings: {
					...store.settings!,
					enabled: false,
					modelCredentialId: 'openai-id',
					modelName: 'gpt-4o',
				},
			});
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });

			const { getByTestId, getByText, queryByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-enable-button')).toBeVisible();
			expect(queryByTestId('n8n-agent-status-menu')).toBeNull();
			expect(getByText('settings.n8nAgent.permissions.title')).toBeVisible();
		});
	});

	describe('empty state', () => {
		it('shows the empty state when disabled and never configured', () => {
			store.$patch({ settings: { ...store.settings!, enabled: false } });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });

			const { getByText, queryByText } = renderComponent();
			expect(getByText('settings.n8nAgent.empty.title')).toBeVisible();
			expect(queryByText('settings.n8nAgent.permissions.title')).toBeNull();
		});

		it('hides content when disabled via moduleSettings fallback', () => {
			store.$patch({ settings: null });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });

			const { queryByText } = renderComponent();
			expect(queryByText('settings.n8nAgent.permissions.title')).toBeNull();
		});

		it('falls back to moduleSettings when store.settings is null', () => {
			store.$patch({ settings: null });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: true });

			const { getByText } = renderComponent();
			expect(getByText('settings.n8nAgent.permissions.title')).toBeVisible();
		});
	});

	describe('credential rows', () => {
		it('shows add buttons when nothing is configured', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-model-add')).toBeVisible();
			expect(getByTestId('n8n-agent-sandbox-add')).toBeVisible();
			expect(getByTestId('n8n-agent-search-setup')).toBeVisible();
		});

		it('opens search setup from the unconfigured row', async () => {
			const { findByTestId, getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-search-setup'));

			expect(await findByTestId('n8n-agent-search-provider-select')).toBeVisible();
		});

		it('shows an explicit disabled search decision as configured', () => {
			store.$patch({ settings: { ...store.settings!, searchDisabled: true } });

			const { getByText, queryByTestId } = renderComponent();

			expect(queryByTestId('n8n-agent-search-setup')).toBeNull();
			expect(getByText('instanceAi.onboarding.disabled')).toBeVisible();
		});

		it('shows the configured model value once a credential pair is set', () => {
			store.$patch({
				settings: { ...store.settings!, modelCredentialId: 'openai-id', modelName: 'gpt-4o' },
				instanceModelCredentials: [{ id: 'openai-id', name: 'OpenAI', type: 'openAiApi' }],
			});

			const { getByText, queryByTestId } = renderComponent();
			expect(queryByTestId('n8n-agent-model-add')).toBeNull();
			expect(getByText('OpenAI · gpt-4o')).toBeVisible();
		});

		it('keeps the model name editable when only the model connection is environment-managed', async () => {
			store.$patch({
				settings: {
					...store.settings!,
					modelEnvConfigured: true,
					modelName: 'gpt-4o',
					envManaged: {
						model: { provider: true, apiKey: true, baseUrl: false, model: false },
						sandbox: { provider: false, serviceUrl: false, apiKey: false },
						search: { provider: false, apiKey: false, url: false },
					},
				},
			});
			vi.mocked(fetchSettings).mockResolvedValue(store.settings!);
			vi.spyOn(store, 'save').mockResolvedValue(true);
			vi.spyOn(store, 'verifyModel').mockResolvedValue({ ok: true });

			const { findByTestId, findByText, getByTestId } = renderComponent();
			await fireEvent.click(getByTestId('n8n-agent-model-row'));

			const providerInput = await findByTestId('n8n-agent-model-provider-input');
			const apiKeyInput = getByTestId('n8n-agent-model-api-key-input');
			const modelField = getByTestId('n8n-agent-model-name-input');
			const modelInput =
				modelField.tagName === 'INPUT'
					? (modelField as HTMLInputElement)
					: modelField.querySelector('input')!;
			expect(providerInput.querySelector('input') ?? providerInput).toBeDisabled();
			expect(apiKeyInput.querySelector('input') ?? apiKeyInput).toBeDisabled();
			expect(modelInput).not.toBeDisabled();

			await fireEvent.click(modelInput);
			await fireEvent.click(await findByText('claude-opus-5 · instanceAi.onboarding.recommended'));
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));
			await waitFor(() => expect(store.draft).toMatchObject({ modelName: 'claude-opus-5' }));
		});

		it('shows fully environment-managed model and sandbox rows without edit affordances', async () => {
			store.$patch({
				settings: {
					...store.settings!,
					modelEnvConfigured: true,
					sandboxEnabled: true,
					sandboxEnvConfigured: true,
					envManaged: {
						model: { provider: true, apiKey: true, baseUrl: false, model: true },
						sandbox: { provider: true, serviceUrl: true, apiKey: true },
						search: { provider: false, apiKey: false, url: false },
					},
				},
			});
			vi.mocked(fetchSettings).mockResolvedValue(store.settings!);

			const { getByTestId, queryByTestId } = renderComponent();
			await waitFor(() => expect(store.isLoading).toBe(false));
			expect(getByTestId('n8n-agent-model-env-value')).toBeVisible();
			expect(getByTestId('n8n-agent-sandbox-env-value')).toBeVisible();

			await fireEvent.click(getByTestId('n8n-agent-model-row'));
			await fireEvent.click(getByTestId('n8n-agent-sandbox-row'));
			expect(queryByTestId('n8n-agent-model-dialog')).toBeNull();
			expect(queryByTestId('n8n-agent-sandbox-dialog')).toBeNull();
		});

		it('enables an environment-managed sandbox on an active instance', async () => {
			store.$patch({
				settings: {
					...store.settings!,
					sandboxEnabled: false,
					sandboxEnvConfigured: true,
				},
			});
			vi.mocked(fetchSettings).mockResolvedValue(store.settings!);
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-sandbox-enable'));

			expect(store.draft.sandboxEnabled).toBe(true);
			expect(save).toHaveBeenCalledOnce();
			expect(queryByTestId('n8n-agent-sandbox-dialog')).toBeNull();
		});

		it('shows environment-managed search without an edit affordance', async () => {
			store.$patch({ settings: { ...store.settings!, searchEnvConfigured: true } });

			const { getByText, getByTestId, queryByTestId } = renderComponent();
			expect(queryByTestId('n8n-agent-search-setup')).toBeNull();
			expect(getByText('instanceAi.onboarding.foundOnServer')).toBeVisible();
			expect(getByTestId('n8n-agent-search-env-value')).toBeVisible();

			await fireEvent.click(getByTestId('n8n-agent-search-row'));
			expect(queryByTestId('n8n-agent-search-provider-select')).toBeNull();
		});

		it('fetches credential types on mount so deep links can render connection fields', () => {
			renderComponent();

			expect(fetchCredentialTypesSpy).toHaveBeenCalledWith(false);
		});

		it('keeps the sandbox row visible when the assistant proxy is enabled', () => {
			setModuleSettings(settingsStore, { ...defaultModuleSettings, proxyEnabled: true });

			const { getByTestId, queryByTestId } = renderComponent();
			expect(queryByTestId('n8n-agent-model-row')).toBeNull();
			expect(getByTestId('n8n-agent-sandbox-row')).toBeVisible();
			expect(queryByTestId('n8n-agent-search-row')).toBeNull();
		});

		it('hides provider rows on cloud deployments', () => {
			setModuleSettings(settingsStore, { ...defaultModuleSettings, cloudManaged: true });

			const { queryByTestId } = renderComponent();
			expect(queryByTestId('n8n-agent-model-row')).toBeNull();
			expect(queryByTestId('n8n-agent-sandbox-row')).toBeNull();
			expect(queryByTestId('n8n-agent-search-row')).toBeNull();
		});
	});

	describe('data sharing', () => {
		it('links to the AI usage settings instead of duplicating its controls', async () => {
			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-data-sharing-row'));

			expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.AI_SETTINGS });
		});

		it('does not link without permission to manage AI usage', async () => {
			vi.mocked(hasPermission).mockImplementation(
				(_permissionNames, options) => options?.rbac?.scope !== 'aiAssistant:manage',
			);
			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-data-sharing-row'));

			expect(routerPushMock).not.toHaveBeenCalled();
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
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-mcp-access-toggle'));

			expect(setField).toHaveBeenCalledWith('mcpAccessEnabled', false);
			expect(save).toHaveBeenCalled();
		});

		it('shows the Execute MCP tools permission when the group is expanded', async () => {
			const { getByTestId, getByLabelText } = renderComponent();

			await fireEvent.click(getByLabelText('Toggle settings.n8nAgent.permissions.group.mcp'));

			await waitFor(() => expect(getByTestId('n8n-agent-permission-executeMcpTool')).toBeVisible());
		});

		it('locks the MCP permission group when MCP access is disabled', () => {
			store.$patch({ settings: { ...store.settings!, mcpAccessEnabled: false } });

			const { getByText, queryByTestId, queryByLabelText } = renderComponent();

			expect(getByText('settings.n8nAgent.permissions.group.mcpDisabled')).toBeVisible();
			expect(queryByLabelText('Toggle settings.n8nAgent.permissions.group.mcp')).toBeNull();
			expect(queryByTestId('n8n-agent-permission-executeMcpTool')).toBeNull();
		});

		it('hides the MCP settings card when the connections experiment is disabled', () => {
			mcpConnectionsExperimentMock.mockReturnValue({ isFeatureEnabled: ref(false) });

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('n8n-agent-mcp-access-toggle')).toBeNull();
			expect(queryByTestId('n8n-agent-permission-group-mcp')).toBeNull();
		});
	});

	describe('Permissions groups', () => {
		it('renders a row per permission group', () => {
			const { getByTestId } = renderComponent();
			for (const group of ['workflows', 'folders', 'dataTables', 'credentials', 'system', 'web']) {
				expect(getByTestId(`n8n-agent-permission-group-${group}`)).toBeVisible();
			}
		});

		it('summarises non-default permissions as exceptions', () => {
			store.$patch({
				settings: {
					...store.settings!,
					permissions: { createWorkflow: 'always_allow', deleteWorkflow: 'blocked' },
				},
			});

			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-permission-group-workflows').textContent).toContain(
				'settings.n8nAgent.permissions.group.exceptions',
			);
			expect(getByTestId('n8n-agent-permission-group-folders').textContent).toContain(
				'settings.n8nAgent.permissions.group.default',
			);
		});

		it('persists a permission change from an expanded group', async () => {
			const setPermission = vi.spyOn(store, 'setPermission');
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, getByLabelText, getAllByText } = renderComponent();

			await fireEvent.click(getByLabelText('Toggle settings.n8nAgent.permissions.group.folders'));
			await waitFor(() => expect(getByTestId('n8n-agent-permission-createFolder')).toBeVisible());

			const select = getByTestId('n8n-agent-permission-createFolder');
			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(getAllByText('settings.n8nAgent.permissions.alwaysAllow')[0]);

			expect(setPermission).toHaveBeenCalledWith('createFolder', 'always_allow');
			expect(save).toHaveBeenCalled();
		});
	});
});
