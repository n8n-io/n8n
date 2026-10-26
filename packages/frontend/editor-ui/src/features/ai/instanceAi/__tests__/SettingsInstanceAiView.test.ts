import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import SettingsInstanceAiView from '../views/SettingsInstanceAiView.vue';
import ConnectionDialog from '../components/settings/ConnectionDialog.vue';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { fetchSettings } from '../instanceAi.settings.api';
import type { FrontendModuleSettings } from '@n8n/api-types';
import type { ICredentialType } from 'n8n-workflow';
import { defaultModuleSettings } from './createThreadComponentRenderer';

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
	fetchServiceCredentials: vi.fn().mockResolvedValue([]),
	fetchInstanceModelCredentials: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(true),
}));

const {
	contextPreferencesEnabledMock,
	contextSkillsEnabledMock,
	routerPushMock,
	confirmMock,
	testSavedCredentialMock,
} = vi.hoisted(() => ({
	contextPreferencesEnabledMock: vi.fn(() => true),
	contextSkillsEnabledMock: vi.fn(() => true),
	routerPushMock: vi.fn(),
	confirmMock: vi.fn(),
	testSavedCredentialMock: vi.fn(),
}));

vi.mock('../composables/useInstanceCredentialTest', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../composables/useInstanceCredentialTest')>();
	return {
		useInstanceCredentialTest: () => ({
			...actual.useInstanceCredentialTest(),
			testSavedCredential: testSavedCredentialMock,
		}),
	};
});

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: confirmMock }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/features/settings/context/context.utils', () => ({
	isContextPreferencesEnabled: () => contextPreferencesEnabledMock(),
	isContextSkillsEnabled: () => contextSkillsEnabledMock(),
}));

const renderComponent = createComponentRenderer(SettingsInstanceAiView);
const renderConnectionDialog = createComponentRenderer(ConnectionDialog);
const renderModelDialog = ({ props }: { props: Record<string, unknown> }) =>
	renderConnectionDialog({ props: { kind: 'model', ...props } });
const renderSearchDialog = ({ props }: { props: Record<string, unknown> }) =>
	renderConnectionDialog({ props: { kind: 'search', ...props } });

async function selectOption(select: HTMLElement, label: string) {
	const listboxId = select.querySelector('input')?.getAttribute('aria-controls');
	expect(listboxId).toBeTruthy();
	const option = Array.from(
		document.getElementById(listboxId!)?.querySelectorAll('[role="option"]') ?? [],
	).find((element) => element.textContent === label);
	expect(option).toBeDefined();
	await fireEvent.click(option!);
}

function setPlanName(settingsStore: ReturnType<typeof useSettingsStore>, planName: string) {
	settingsStore.settings.license = { ...settingsStore.settings.license, planName };
}

const fullyConfigured = {
	modelEnvConfigured: true,
	sandboxEnabled: true,
	sandboxEnvConfigured: true,
	searchDisabled: true,
};

function setModuleSettings(
	settingsStore: ReturnType<typeof useSettingsStore>,
	instanceAi: FrontendModuleSettings['instance-ai'],
) {
	settingsStore.moduleSettings = { 'instance-ai': instanceAi };
}

describe('SettingsInstanceAiView', () => {
	let store: ReturnType<typeof useInstanceAiSettingsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let fetchCredentialTypesSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(fetchSettings).mockResolvedValue(null as never);
		vi.mocked(hasPermission).mockReturnValue(true);
		testSavedCredentialMock.mockResolvedValue(true);
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
			vi.mocked(store.fetch).mockResolvedValue(true);
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

	describe('page header', () => {
		it('shows the limited enterprise support badge next to the title on enterprise', () => {
			setPlanName(settingsStore, 'Enterprise');

			const { getByRole, getByTestId } = renderComponent();
			const title = getByRole('heading', { name: 'settings.n8nAgent' });
			expect(title.parentElement).toContainElement(
				getByTestId('n8n-agent-enterprise-readiness-badge'),
			);
		});

		it('does not show the limited enterprise support badge on other plans', () => {
			setPlanName(settingsStore, 'Business');

			const { queryByTestId } = renderComponent();
			expect(queryByTestId('n8n-agent-enterprise-readiness-badge')).toBeNull();
		});

		it('does not show a Preview badge', () => {
			const { queryByText } = renderComponent();
			expect(queryByText('Preview')).toBeNull();
		});
	});

	describe('enable switch', () => {
		const modelSaveDialog = 'n8n-agent-model-dialog-save';

		function mockPersistEnabled() {
			vi.mocked(store.fetch).mockResolvedValue(true);
			return vi.mocked(store.persistEnabled).mockImplementation(async (value) => {
				store.$patch({ settings: { ...store.settings!, enabled: value } });
				return true;
			});
		}

		/** Applies each saved draft to the settings, like the server would. */
		function mockSave() {
			return vi.mocked(store.save).mockImplementation(async () => {
				const draft = { ...store.draft };
				const next = { ...store.settings! };
				if (draft.modelConnection) {
					next.modelCredentialId = 'saved-model';
					next.modelName = draft.modelName ?? null;
				}
				if (draft.sandboxEnabled !== undefined) next.sandboxEnabled = draft.sandboxEnabled;
				if (draft.searchDisabled !== undefined) next.searchDisabled = draft.searchDisabled;
				store.$patch({ settings: next });
				for (const key of Object.keys(store.draft)) Reflect.deleteProperty(store.draft, key);
				return true;
			});
		}

		function disable(overrides: Record<string, unknown> = {}) {
			store.$patch({ settings: { ...store.settings!, enabled: false, ...overrides } });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });
		}

		it('shows the switch on when enabled and fully configured', () => {
			store.$patch({ settings: { ...store.settings!, ...fullyConfigured } });

			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-enable-toggle')).toHaveAttribute('aria-checked', 'true');
		});

		it('keeps the switch on without opening setup when enabled but setup is incomplete', () => {
			const { getByTestId, queryByTestId } = renderComponent();

			expect(getByTestId('n8n-agent-enable-toggle')).toHaveAttribute('aria-checked', 'true');
			expect(getByTestId('n8n-agent-model-add')).toBeVisible();
			expect(queryByTestId(modelSaveDialog)).toBeNull();
		});

		it('shows the switch off with dimmed sections when disabled but configured', () => {
			disable({ modelCredentialId: 'openai-id', modelName: 'gpt-4o' });

			const { getByTestId, getByText } = renderComponent();
			expect(getByTestId('n8n-agent-enable-toggle')).toHaveAttribute('aria-checked', 'false');
			expect(getByText('settings.n8nAgent.permissions.title')).toBeVisible();
		});

		it('does not show the switch to members', () => {
			vi.mocked(hasPermission).mockReturnValue(false);

			const { queryByTestId } = renderComponent();
			expect(queryByTestId('n8n-agent-enable-toggle')).toBeNull();
		});

		it('saves enabled and opens nothing when setup is complete', async () => {
			disable(fullyConfigured);
			const persistEnabled = mockPersistEnabled();
			const { getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));

			await waitFor(() => expect(persistEnabled).toHaveBeenCalledExactlyOnceWith(true));
			expect(getByTestId('n8n-agent-enable-toggle')).toHaveAttribute('aria-checked', 'true');
			expect(queryByTestId(modelSaveDialog)).toBeNull();
			expect(queryByTestId('n8n-agent-sandbox-dialog-save')).toBeNull();
			expect(queryByTestId('n8n-agent-search-dialog-save')).toBeNull();
		});

		it('opens the model dialog without saving enabled when the model is missing', async () => {
			disable({ sandboxEnabled: true, sandboxEnvConfigured: true, searchDisabled: true });
			const persistEnabled = mockPersistEnabled();
			const { findByTestId, getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));

			expect(await findByTestId(modelSaveDialog)).toBeVisible();
			expect(getByTestId('n8n-agent-enable-toggle')).toHaveAttribute('aria-checked', 'true');
			expect(persistEnabled).not.toHaveBeenCalled();
		});

		it('turns the switch back off without saving enabled when a setup dialog is cancelled', async () => {
			disable({ sandboxEnabled: true, sandboxEnvConfigured: true, searchDisabled: true });
			const persistEnabled = mockPersistEnabled();
			const { findByTestId, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));
			await fireEvent.click(await findByTestId('n8n-agent-model-dialog-cancel'));

			await waitFor(() => expect(queryByTestId(modelSaveDialog)).toBeNull());
			expect(getByTestId('n8n-agent-enable-toggle')).toHaveAttribute('aria-checked', 'false');
			expect(persistEnabled).not.toHaveBeenCalled();
			expect(store.settings?.enabled).toBe(false);
		});

		it('continues to the next missing item after the model is saved', async () => {
			disable({ searchDisabled: true });
			const persistEnabled = mockPersistEnabled();
			mockSave();
			vi.mocked(store.verifyModel).mockResolvedValue({ ok: true });
			const { findByTestId, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));
			const modelApiKey = await findByTestId('n8n-agent-model-api-key-input');
			await fireEvent.update(modelApiKey.querySelector('input') ?? modelApiKey, 'model-key');
			await fireEvent.click(getByTestId(modelSaveDialog));

			expect(await findByTestId('n8n-agent-sandbox-dialog-save')).toBeVisible();
			await waitFor(() => expect(queryByTestId(modelSaveDialog)).toBeNull());
			expect(persistEnabled).not.toHaveBeenCalled();
		});

		it('saves enabled once the last missing item is saved', async () => {
			disable({ modelEnvConfigured: true, sandboxEnabled: true, sandboxEnvConfigured: true });
			const persistEnabled = mockPersistEnabled();
			mockSave();
			const { findByTestId, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));
			await fireEvent.click(await findByTestId('assistant-search-disabled'));
			await fireEvent.click(getByTestId('n8n-agent-search-dialog-save'));

			await waitFor(() => expect(persistEnabled).toHaveBeenCalledExactlyOnceWith(true));
			await waitFor(() => expect(queryByTestId('n8n-agent-search-dialog-save')).toBeNull());
			expect(getByTestId('n8n-agent-enable-toggle')).toHaveAttribute('aria-checked', 'true');
		});

		it('switches on an environment-configured sandbox before saving enabled', async () => {
			disable({ modelEnvConfigured: true, sandboxEnvConfigured: true, searchDisabled: true });
			const persistEnabled = mockPersistEnabled();
			const save = mockSave();
			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));

			await waitFor(() => expect(persistEnabled).toHaveBeenCalledExactlyOnceWith(true));
			expect(save).toHaveBeenCalledOnce();
			expect(store.settings?.sandboxEnabled).toBe(true);
		});

		describe('with a saved model credential', () => {
			const savedModel = {
				modelCredentialId: 'openai-id',
				modelName: 'gpt-4o',
				sandboxEnabled: true,
				sandboxEnvConfigured: true,
				searchDisabled: true,
			};

			beforeEach(() => {
				disable(savedModel);
				store.$patch({
					instanceModelCredentials: [{ id: 'openai-id', name: 'OpenAI', type: 'openAiApi' }],
				});
			});

			it('opens the model dialog without saving enabled when the credential test fails', async () => {
				testSavedCredentialMock.mockResolvedValue(false);
				const persistEnabled = mockPersistEnabled();
				const { findByTestId, getByTestId } = renderComponent();

				await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));

				expect(await findByTestId(modelSaveDialog)).toBeVisible();
				expect(testSavedCredentialMock).toHaveBeenCalledExactlyOnceWith(
					'openai-id',
					'OpenAI',
					'openAiApi',
				);
				expect(persistEnabled).not.toHaveBeenCalled();
			});

			it('saves enabled when the credential test passes', async () => {
				const persistEnabled = mockPersistEnabled();
				const { getByTestId, queryByTestId } = renderComponent();

				await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));

				await waitFor(() => expect(persistEnabled).toHaveBeenCalledExactlyOnceWith(true));
				expect(testSavedCredentialMock).toHaveBeenCalledOnce();
				expect(queryByTestId(modelSaveDialog)).toBeNull();
			});

			it('does not test credentials when the admin cannot manage instance credentials', async () => {
				vi.mocked(hasPermission).mockImplementation(
					(_, options) => options?.rbac?.scope !== 'credential:manageInstance',
				);
				const persistEnabled = mockPersistEnabled();
				const { getByTestId } = renderComponent();

				await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));

				await waitFor(() => expect(persistEnabled).toHaveBeenCalledExactlyOnceWith(true));
				expect(testSavedCredentialMock).not.toHaveBeenCalled();
			});
		});

		it.each([
			{ missing: 'model', patch: { searchDisabled: true }, dialog: modelSaveDialog },
			{
				missing: 'sandbox',
				patch: { modelEnvConfigured: true, searchDisabled: true },
				dialog: 'n8n-agent-sandbox-dialog-save',
			},
			{
				missing: 'search',
				patch: { modelEnvConfigured: true, sandboxEnabled: true, sandboxEnvConfigured: true },
				dialog: 'n8n-agent-search-dialog-save',
			},
		])('resumes setup at the missing $missing', async ({ patch, dialog }) => {
			disable(patch);
			const persistEnabled = mockPersistEnabled();
			const { findByTestId, getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));

			expect(await findByTestId(dialog)).toBeVisible();
			expect(persistEnabled).not.toHaveBeenCalled();
		});

		it('asks for confirmation and saves disabled when the admin confirms', async () => {
			store.$patch({ settings: { ...store.settings!, ...fullyConfigured } });
			const persistEnabled = mockPersistEnabled();
			confirmMock.mockResolvedValue(MODAL_CONFIRM);
			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));

			await waitFor(() => expect(persistEnabled).toHaveBeenCalledExactlyOnceWith(false));
			expect(confirmMock).toHaveBeenCalledOnce();
		});

		it('keeps the Assistant on when the admin cancels the confirmation', async () => {
			store.$patch({ settings: { ...store.settings!, ...fullyConfigured } });
			const persistEnabled = mockPersistEnabled();
			confirmMock.mockResolvedValue('cancel');
			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-toggle'));

			await waitFor(() => expect(confirmMock).toHaveBeenCalledOnce());
			expect(persistEnabled).not.toHaveBeenCalled();
			expect(getByTestId('n8n-agent-enable-toggle')).toHaveAttribute('aria-checked', 'true');
		});
	});

	describe('off state', () => {
		it('shows sub-feature switches as disabled and unchecked while off', () => {
			store.$patch({ settings: { ...store.settings!, enabled: false, ...fullyConfigured } });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });

			const { getByTestId } = renderComponent();
			for (const testId of ['n8n-agent-browser-use-toggle', 'n8n-agent-mcp-access-toggle']) {
				expect(getByTestId(testId)).toBeDisabled();
				expect(getByTestId(testId)).toHaveAttribute('aria-checked', 'false');
			}
			expect(store.settings?.mcpAccessEnabled).toBe(true);
		});

		it('hides the missing model warning while off', () => {
			store.$patch({ settings: { ...store.settings!, enabled: false, searchDisabled: true } });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });

			const { getByTestId, queryByText } = renderComponent();
			expect(getByTestId('n8n-agent-model-row')).toBeVisible();
			expect(queryByText('settings.n8nAgent.modelCredential.missing.description')).toBeNull();
		});

		it('shows the missing model warning while on', () => {
			const { getByText } = renderComponent();
			expect(getByText('settings.n8nAgent.modelCredential.missing.description')).toBeVisible();
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

		it('opens the first missing setup item from the empty state without saving enabled', async () => {
			store.$patch({ settings: { ...store.settings!, enabled: false } });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });
			vi.mocked(store.fetch).mockResolvedValue(true);
			const persistEnabled = vi.mocked(store.persistEnabled);
			const { findByTestId, getByText } = renderComponent();

			await fireEvent.click(getByText('settings.n8nAgent.empty.enable'));

			expect(await findByTestId('n8n-agent-model-dialog-save')).toBeVisible();
			expect(persistEnabled).not.toHaveBeenCalled();
		});

		it('saves enabled directly from the empty state when the assistant proxy is enabled', async () => {
			store.$patch({ settings: { ...store.settings!, enabled: false } });
			setModuleSettings(settingsStore, {
				...defaultModuleSettings,
				enabled: false,
				proxyEnabled: true,
			});
			vi.mocked(store.fetch).mockResolvedValue(true);
			const persistEnabled = vi.mocked(store.persistEnabled).mockResolvedValue(true);
			const { getByText, queryByTestId } = renderComponent();

			await fireEvent.click(getByText('settings.n8nAgent.empty.enable'));

			await waitFor(() => expect(persistEnabled).toHaveBeenCalledExactlyOnceWith(true));
			expect(queryByTestId('n8n-agent-sandbox-dialog-save')).toBeNull();
		});

		it('shows the limited enterprise support badge in the empty state', () => {
			setPlanName(settingsStore, 'Enterprise');
			store.$patch({ settings: { ...store.settings!, enabled: false } });
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });

			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-enterprise-readiness-badge')).toBeVisible();
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
			await fireEvent.click(
				await findByText('claude-opus-5-5 · instanceAi.onboarding.recommended'),
			);
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));
			await waitFor(() => expect(store.draft).toMatchObject({ modelName: 'claude-opus-5-5' }));
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
			expect(getByTestId('n8n-agent-sandbox-env-value')).toHaveTextContent(
				'instanceAi.onboarding.foundOnServer',
			);

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
		it('shows the browser use toggle', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-browser-use-toggle')).toBeVisible();
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

		it('shows the MCP tool category permissions when the group is expanded', async () => {
			const { getByTestId, getByLabelText, queryByTestId } = renderComponent();

			await fireEvent.click(getByLabelText('Toggle settings.n8nAgent.permissions.group.mcp'));

			await waitFor(() => {
				expect(getByTestId('n8n-agent-permission-mcpRead')).toBeVisible();
				expect(getByTestId('n8n-agent-permission-mcpWrite')).toBeVisible();
			});
			expect(queryByTestId('n8n-agent-permission-executeMcpTool')).toBeNull();
		});

		it.each([
			{
				permissions: { mcpRead: 'always_allow' as const, mcpWrite: 'require_approval' as const },
				summary: 'settings.n8nAgent.permissions.group.default',
			},
			{
				permissions: { mcpRead: 'blocked' as const, mcpWrite: 'require_approval' as const },
				summary: 'settings.n8nAgent.permissions.group.exception',
			},
			{
				permissions: { mcpRead: 'blocked' as const, mcpWrite: 'always_allow' as const },
				summary: 'settings.n8nAgent.permissions.group.exceptions',
			},
		])('shows $summary for MCP tool category permissions', ({ permissions, summary }) => {
			store.$patch({
				settings: {
					...store.settings!,
					permissions,
				},
			});

			const { getByTestId } = renderComponent();

			expect(getByTestId('n8n-agent-permission-group-mcp').textContent).toContain(summary);
		});

		it('locks the MCP permission group when MCP access is disabled', () => {
			store.$patch({ settings: { ...store.settings!, mcpAccessEnabled: false } });

			const { queryByTestId, queryByLabelText } = renderComponent();

			expect(queryByLabelText('Toggle settings.n8nAgent.permissions.group.mcp')).toBeNull();
			expect(queryByTestId('n8n-agent-permission-mcpRead')).toBeNull();
			expect(queryByTestId('n8n-agent-permission-mcpWrite')).toBeNull();
		});

		it('persists an MCP tool category permission change', async () => {
			const setPermission = vi.spyOn(store, 'setPermission');
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, getByLabelText } = renderComponent();

			await fireEvent.click(getByLabelText('Toggle settings.n8nAgent.permissions.group.mcp'));
			await waitFor(() => expect(getByTestId('n8n-agent-permission-mcpWrite')).toBeVisible());

			await selectOption(
				getByTestId('n8n-agent-permission-mcpWrite'),
				'settings.n8nAgent.permissions.blocked',
			);

			expect(setPermission).toHaveBeenCalledWith('mcpWrite', 'blocked');
			expect(save).toHaveBeenCalled();
		});

		it('offers only always_allow and blocked for createPreference', async () => {
			// N8nSelect (element-plus) teleports its option list to the document
			// body and only mounts it once open, so the options never show up in
			// `select.textContent`. Open the select and read the teleported list
			// instead of the select's own DOM subtree.
			const { getByTestId, getByLabelText } = renderComponent();
			await fireEvent.click(
				getByLabelText('Toggle settings.n8nAgent.permissions.group.preferences'),
			);
			const select = await waitFor(() => getByTestId('n8n-agent-permission-createPreference'));
			expect(select).toBeVisible();

			const input = select.querySelector('input')!;
			await fireEvent.click(input);
			const listboxId = input.getAttribute('aria-controls');
			const options = await waitFor(() => {
				const listbox = document.getElementById(listboxId!);
				expect(listbox).not.toBeNull();
				return Array.from(listbox!.querySelectorAll('[role="option"]')).map(
					(option) => option.textContent,
				);
			});
			expect(options).toEqual([
				'settings.n8nAgent.permissions.alwaysAllow',
				'settings.n8nAgent.permissions.blocked',
			]);
		});
	});

	describe('Permissions groups', () => {
		it('renders a row per permission group', () => {
			const { getByTestId } = renderComponent();
			for (const group of [
				'workflows',
				'nodes',
				'folders',
				'dataTables',
				'credentials',
				'system',
				'web',
			]) {
				expect(getByTestId(`n8n-agent-permission-group-${group}`)).toBeVisible();
			}
		});

		it('shows the Execute a node permission when the Nodes group is expanded', async () => {
			const { getByTestId, getByLabelText } = renderComponent();

			await fireEvent.click(getByLabelText('Toggle settings.n8nAgent.permissions.group.nodes'));

			await waitFor(() => expect(getByTestId('n8n-agent-permission-executeNode')).toBeVisible());
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

		it('hides the Preferences group while the 111_context_preferences flag is off', () => {
			contextPreferencesEnabledMock.mockReturnValueOnce(false);

			const { queryByTestId, getByTestId } = renderComponent();

			expect(queryByTestId('n8n-agent-permission-group-preferences')).toBeNull();
			expect(getByTestId('n8n-agent-permission-group-workflows')).toBeVisible();
		});

		it('shows the Skills group while the skills hub is on', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('n8n-agent-permission-group-skills').textContent).toContain(
				'settings.n8nAgent.permissions.group.default',
			);
		});

		it('hides the Skills group while the skills hub is off', () => {
			contextSkillsEnabledMock.mockReturnValueOnce(false);

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('n8n-agent-permission-group-skills')).toBeNull();
		});

		it('summarises the untouched Preferences group as the default', () => {
			// createPreference defaults to always_allow. A summary that compares
			// against require_approval would read the untouched group as an
			// exception.
			const { getByTestId } = renderComponent();
			expect(getByTestId('n8n-agent-permission-group-preferences').textContent).toContain(
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
