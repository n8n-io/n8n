import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick, ref } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';
import SettingsInstanceAiView from '../views/SettingsInstanceAiView.vue';
import ConnectionDialog from '../components/settings/ConnectionDialog.vue';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { fetchInstanceModelCredentials, fetchSettings } from '../instanceAi.settings.api';
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

vi.mock('../components/settings/ConnectionFields.vue', async () => {
	const { defineComponent, h } = await import('vue');
	return {
		default: defineComponent({
			props: { data: { type: Object, required: true } },
			emits: ['update'],
			setup(props, { emit }) {
				const input = (name: string, type = 'text') =>
					h('input', {
						'data-test-id': `connection-${name}`,
						type,
						value: (props.data as Record<string, unknown>)[name] ?? '',
						onInput: (event: Event) =>
							emit('update', name, (event.target as HTMLInputElement).value),
					});
				return () => h('div', [input('apiUrl'), input('apiKey', 'password')]);
			},
		}),
	};
});

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
const renderSandboxDialog = ({ props }: { props: Record<string, unknown> }) =>
	renderConnectionDialog({ props: { kind: 'sandbox', ...props } });
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

	describe('Model credential dialog', () => {
		it('allows selecting an existing connection without the provider connection scope', async () => {
			vi.mocked(hasPermission).mockImplementation(
				(_permissionNames, options) => options?.rbac?.scope !== 'credential:manageInstance',
			);
			store.$patch({
				settings: { ...store.settings!, modelCredentialId: 'openai-id', modelName: 'gpt-4o' },
				instanceModelCredentials: [
					{ id: 'openai-id', name: 'AI Assistant model', type: 'openAiApi' },
					{ id: 'anthropic-id', name: 'Backup', type: 'anthropicApi' },
				],
			});
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);

			const { getByTestId, findByTestId, findByText, queryByTestId } = renderModelDialog({
				props: { open: true },
			});
			const select = await findByTestId('n8n-agent-model-provider-select');

			await waitFor(() => expect(select.querySelector('input')).not.toBeDisabled());
			expect(queryByTestId('n8n-agent-model-connection-fields')).toBeNull();
			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('Backup · Anthropic'));
			const modelNameField = getByTestId('n8n-agent-model-name-input');
			const modelNameInput =
				modelNameField.tagName === 'INPUT'
					? (modelNameField as HTMLInputElement)
					: modelNameField.querySelector('input')!;
			await fireEvent.update(modelNameInput, 'claude-sonnet-4');
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));

			expect(store.draft).toMatchObject({
				modelCredentialId: 'anthropic-id',
				modelName: 'claude-sonnet-4',
			});
			expect(save).toHaveBeenCalledOnce();
		});

		it('allows provider connection managers to select an existing connection', async () => {
			store.$patch({
				instanceModelCredentials: [{ id: 'anthropic-id', name: 'Backup', type: 'anthropicApi' }],
			});
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, findByTestId, findByText, queryByTestId } = renderModelDialog({
				props: { open: true },
			});
			const select = await findByTestId('n8n-agent-model-provider-select');

			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('Backup · Anthropic'));
			expect(queryByTestId('n8n-agent-model-connection-fields')).toBeNull();
			const modelNameField = getByTestId('n8n-agent-model-name-input');
			const modelNameInput =
				modelNameField.tagName === 'INPUT'
					? (modelNameField as HTMLInputElement)
					: modelNameField.querySelector('input')!;
			await fireEvent.update(modelNameInput, 'claude-sonnet-4');
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));

			expect(store.draft).toMatchObject({
				modelCredentialId: 'anthropic-id',
				modelName: 'claude-sonnet-4',
			});
			expect(save).toHaveBeenCalledOnce();
		});

		it('stages an inline connection and only saves once a model name is committed', async () => {
			const credentialsStore = useCredentialsStore();
			vi.spyOn(credentialsStore, 'getCredentialData').mockResolvedValue({
				data: { apiKey: '__blank' },
			} as never);
			const testCredential = vi.spyOn(credentialsStore, 'testCredential');
			store.$patch({
				settings: { ...store.settings!, modelCredentialId: 'openai-id', modelName: 'gpt-4o' },
				instanceModelCredentials: [
					{ id: 'openai-id', name: 'AI Assistant model', type: 'openAiApi' },
				],
			});
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, findByTestId, findByText } = renderModelDialog({
				props: { open: true },
			});

			const select = await findByTestId('n8n-agent-model-provider-select');
			await waitFor(() => expect(select.querySelector('input')!.value).toBe('OpenAI'));

			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('Anthropic'));

			const saveButton = getByTestId('n8n-agent-model-dialog-save');
			expect(saveButton).toBeDisabled();
			expect(save).not.toHaveBeenCalled();

			const modelNameField = getByTestId('n8n-agent-model-name-input');
			const modelNameInput =
				modelNameField.tagName === 'INPUT'
					? (modelNameField as HTMLInputElement)
					: modelNameField.querySelector('input')!;
			await fireEvent.update(modelNameInput, 'claude-sonnet-4');
			await fireEvent.click(saveButton);

			expect(store.draft).toMatchObject({
				modelConnection: { type: 'anthropicApi' },
				modelName: 'claude-sonnet-4',
			});
			expect(save).toHaveBeenCalledOnce();
			expect(testCredential).not.toHaveBeenCalled();
		});

		it('restores the hydrated model name when switching back to the hydrated provider', async () => {
			vi.spyOn(useCredentialsStore(), 'getCredentialData').mockResolvedValue({
				data: { apiKey: '__blank' },
			} as never);
			store.$patch({
				settings: { ...store.settings!, modelCredentialId: 'openai-id', modelName: 'gpt-4o' },
				instanceModelCredentials: [
					{ id: 'openai-id', name: 'AI Assistant model', type: 'openAiApi' },
				],
			});
			const { findByTestId, findByText, getByTestId } = renderModelDialog({
				props: { open: true },
			});

			const select = await findByTestId('n8n-agent-model-provider-select');
			await waitFor(() => expect(select.querySelector('input')!.value).toBe('OpenAI'));

			const modelNameInput = () => {
				const field = getByTestId('n8n-agent-model-name-input');
				return field.tagName === 'INPUT'
					? (field as HTMLInputElement)
					: field.querySelector('input')!;
			};

			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('Anthropic'));
			expect(modelNameInput().value).toBe('');

			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('OpenAI'));
			expect(modelNameInput().value).toBe('gpt-4o');
		});

		it('keeps the dialog open when the saved credential fails its test', async () => {
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([
				{
					name: 'openAiApi',
					displayName: 'OpenAI',
					properties: [],
					test: { request: { url: '/models' } },
				},
			] satisfies ICredentialType[]);
			vi.spyOn(credentialsStore, 'getCredentialData').mockResolvedValue({
				data: { apiKey: '__blank' },
			} as never);
			const testCredential = vi.spyOn(credentialsStore, 'testCredential').mockResolvedValue({
				status: 'Error',
				message: 'Invalid API key',
			});
			store.$patch({
				settings: { ...store.settings!, modelCredentialId: 'openai-id', modelName: 'gpt-4o' },
				instanceModelCredentials: [
					{ id: 'openai-id', name: 'AI Assistant model', type: 'openAiApi' },
				],
			});
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { findByTestId, getByTestId } = renderModelDialog({ props: { open: true } });

			const modelNameField = await findByTestId('n8n-agent-model-name-input');
			const modelNameInput =
				modelNameField.tagName === 'INPUT'
					? (modelNameField as HTMLInputElement)
					: modelNameField.querySelector('input')!;
			await fireEvent.update(modelNameInput, 'gpt-4.1');
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));

			expect(await findByTestId('n8n-agent-model-credential-test-error')).toBeVisible();
			expect(testCredential).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'openai-id', type: 'openAiApi' }),
			);
			expect(save).not.toHaveBeenCalled();
		});

		it('pre-tests a selected existing connection and blocks the save on failure', async () => {
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([
				{
					name: 'anthropicApi',
					displayName: 'Anthropic',
					properties: [],
					test: { request: { url: '/models' } },
				},
			] satisfies ICredentialType[]);
			vi.spyOn(credentialsStore, 'getCredentialData').mockResolvedValue({
				data: { apiKey: '__blank' },
			} as never);
			const testCredential = vi.spyOn(credentialsStore, 'testCredential').mockResolvedValue({
				status: 'Error',
				message: 'Invalid API key',
			});
			store.$patch({
				instanceModelCredentials: [{ id: 'anthropic-id', name: 'Backup', type: 'anthropicApi' }],
			});
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, findByTestId, findByText } = renderModelDialog({
				props: { open: true },
			});
			const select = await findByTestId('n8n-agent-model-provider-select');

			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('Backup · Anthropic'));
			const modelNameField = getByTestId('n8n-agent-model-name-input');
			const modelNameInput =
				modelNameField.tagName === 'INPUT'
					? (modelNameField as HTMLInputElement)
					: modelNameField.querySelector('input')!;
			await fireEvent.update(modelNameInput, 'claude-sonnet-4');
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));

			expect(await findByTestId('n8n-agent-model-credential-test-error')).toBeVisible();
			expect(testCredential).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'anthropic-id', type: 'anthropicApi' }),
			);
			expect(save).not.toHaveBeenCalled();
		});
	});

	describe('Sandbox credential dialog', () => {
		it('preselects the environment option when the sandbox is env-configured', async () => {
			store.$patch({
				settings: { ...store.settings!, sandboxEnvConfigured: true },
			});
			const { getByTestId } = renderSandboxDialog({ props: { open: true } });

			await waitFor(() =>
				expect(getByTestId('n8n-agent-sandbox-provider-select').querySelector('input')!.value).toBe(
					'settings.n8nAgent.connection.none',
				),
			);
		});

		it('keeps the setup action disabled in read-only mode until a connection is selected', async () => {
			vi.mocked(hasPermission).mockImplementation(
				(_permissionNames, options) => options?.rbac?.scope !== 'credential:manageInstance',
			);
			store.$patch({
				serviceCredentials: [
					{
						id: 'daytona-id',
						name: 'Existing Daytona',
						type: 'daytonaApi',
					},
				],
			});
			const { findByTestId, findByText, getByTestId } = renderSandboxDialog({
				props: { open: true, setup: true },
			});

			const select = await findByTestId('n8n-agent-sandbox-provider-select');
			expect(getByTestId('n8n-agent-sandbox-dialog-save')).toBeDisabled();

			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('Existing Daytona · Daytona'));

			expect(getByTestId('n8n-agent-sandbox-dialog-save')).not.toBeDisabled();
		});

		it('clears both sandbox slots when switching back to the environment configuration', async () => {
			store.$patch({
				settings: {
					...store.settings!,
					daytonaCredentialId: 'daytona-id',
					sandboxProvider: 'daytona',
					sandboxEnvConfigured: true,
				},
				serviceCredentials: [
					{
						id: 'daytona-id',
						name: 'Existing Daytona',
						type: 'daytonaApi',
					},
				],
			});
			vi.spyOn(useCredentialsStore(), 'getCredentialData').mockResolvedValue({
				data: { apiUrl: 'https://app.daytona.io/api', apiKey: '__blank' },
			} as never);
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { findByTestId, findByText, getByTestId } = renderSandboxDialog({
				props: { open: true },
			});

			const select = await findByTestId('n8n-agent-sandbox-provider-select');
			await waitFor(() => expect(select.querySelector('input')!).not.toBeDisabled());
			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('settings.n8nAgent.connection.none'));
			await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-save'));

			expect(store.draft).toMatchObject({ sandboxConnection: null });
			expect(save).toHaveBeenCalledOnce();
		});

		it('defaults the provider from settings and stages an inline Daytona connection', async () => {
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, findByTestId, findByText } = renderSandboxDialog({
				props: { open: true },
			});

			const providerSelect = await findByTestId('n8n-agent-sandbox-provider-select');
			await waitFor(() =>
				expect(providerSelect.querySelector('input')!.value).toBe('n8n Sandbox Service'),
			);

			await fireEvent.click(providerSelect.querySelector('input')!);
			await fireEvent.click(await findByText('Daytona'));
			const fields = getByTestId('n8n-agent-sandbox-connection-fields');
			await fireEvent.update(fields.querySelector('input[type="password"]')!, 'daytona-key');

			await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-save'));

			expect(store.draft).toMatchObject({
				sandboxConnection: {
					type: 'daytonaApi',
					data: { apiUrl: 'https://app.daytona.io/api', apiKey: 'daytona-key' },
				},
			});
			expect(save).toHaveBeenCalledOnce();
		});

		it('stages an n8n sandbox API key as an x-api-key header connection', async () => {
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId } = renderSandboxDialog({ props: { open: true } });

			await waitFor(() =>
				expect(getByTestId('n8n-agent-sandbox-provider-select').querySelector('input')!.value).toBe(
					'n8n Sandbox Service',
				),
			);

			const saveButton = getByTestId('n8n-agent-sandbox-dialog-save');
			expect(saveButton).toBeDisabled();

			const keyField = getByTestId('n8n-agent-sandbox-api-key-input');
			const keyInput =
				keyField.tagName === 'INPUT'
					? (keyField as HTMLInputElement)
					: keyField.querySelector('input')!;
			await fireEvent.update(keyInput, 'sk-test');
			await fireEvent.click(saveButton);

			expect(store.draft).toMatchObject({
				sandboxConnection: {
					type: 'httpHeaderAuth',
					data: { name: 'x-api-key', value: 'sk-test' },
				},
			});
			expect(save).toHaveBeenCalledOnce();
		});

		it('allows provider connection managers to select an existing connection', async () => {
			store.$patch({
				serviceCredentials: [
					{
						id: 'daytona-id',
						name: 'Existing Daytona',
						type: 'daytonaApi',
					},
				],
			});
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, findByTestId, findByText, queryByTestId } = renderSandboxDialog({
				props: { open: true },
			});
			const select = await findByTestId('n8n-agent-sandbox-provider-select');

			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('Existing Daytona · Daytona'));
			expect(queryByTestId('n8n-agent-sandbox-connection-fields')).toBeNull();
			await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-save'));

			expect(store.draft).toMatchObject({
				daytonaCredentialId: 'daytona-id',
				n8nSandboxCredentialId: null,
				sandboxProvider: 'daytona',
			});
			expect(save).toHaveBeenCalledOnce();
		});
	});

	describe('Search credential dialog', () => {
		it('preselects SearXNG when search is unconfigured', async () => {
			const { getByTestId } = renderSearchDialog({ props: { open: true } });

			await waitFor(() =>
				expect(getByTestId('n8n-agent-search-provider-select').querySelector('input')!.value).toBe(
					'SearXNG',
				),
			);
			expect(getByTestId('n8n-agent-search-dialog-save')).toBeDisabled();
		});

		it('preselects the environment option when search is env-configured', async () => {
			store.$patch({
				settings: { ...store.settings!, searchEnvConfigured: true },
			});
			const { getByTestId } = renderSearchDialog({ props: { open: true } });

			await waitFor(() =>
				expect(getByTestId('n8n-agent-search-provider-select').querySelector('input')!.value).toBe(
					'settings.n8nAgent.connection.none',
				),
			);
		});

		it('keeps the setup save action disabled until the preselected default is edited', async () => {
			const { getByTestId, findByTestId, findByText } = renderSearchDialog({
				props: { open: true, setup: true },
			});

			const providerSelect = await findByTestId('n8n-agent-search-provider-select');
			await waitFor(() => expect(providerSelect.querySelector('input')!.value).toBe('SearXNG'));
			expect(getByTestId('n8n-agent-search-dialog-save')).toBeDisabled();

			await fireEvent.click(providerSelect.querySelector('input')!);
			await fireEvent.click(await findByText('Brave Search'));

			expect(getByTestId('n8n-agent-search-dialog-save')).toBeDisabled();
			const fields = getByTestId('n8n-agent-search-connection-fields');
			await fireEvent.update(
				fields.querySelector('[data-test-id="connection-apiKey"]')!,
				'brave-key',
			);

			expect(getByTestId('n8n-agent-search-dialog-save')).not.toBeDisabled();
		});

		it('tests a changed connection before saving it', async () => {
			const credentialsStore = useCredentialsStore();
			vi.spyOn(credentialsStore, 'testCredential').mockResolvedValue({
				status: 'Error',
				message: 'Invalid API key',
			});
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, findByTestId, findByText } = renderSearchDialog({
				props: { open: true },
			});
			const providerSelect = await findByTestId('n8n-agent-search-provider-select');

			await fireEvent.click(providerSelect.querySelector('input')!);
			await fireEvent.click(await findByText('Brave Search'));
			await fireEvent.update(
				getByTestId('n8n-agent-search-connection-fields').querySelector(
					'[data-test-id="connection-apiKey"]',
				)!,
				'brave-key',
			);
			await fireEvent.click(getByTestId('n8n-agent-search-dialog-save'));

			expect(save).not.toHaveBeenCalled();
			expect(getByTestId('n8n-agent-search-credential-test-error')).toBeVisible();
		});

		it('allows provider connection managers to select an existing connection', async () => {
			const credentialsStore = useCredentialsStore();
			vi.spyOn(credentialsStore, 'getCredentialData').mockResolvedValue({
				data: { apiKey: '__blank' },
			} as never);
			const testCredential = vi
				.spyOn(credentialsStore, 'testCredential')
				.mockResolvedValue({ status: 'OK', message: 'ok' } as never);
			store.$patch({
				serviceCredentials: [
					{
						id: 'brave-id',
						name: 'Existing search',
						type: 'braveSearchApi',
					},
				],
			});
			const save = vi.spyOn(store, 'save').mockResolvedValue(true);
			const { getByTestId, findByTestId, findByText, queryByTestId } = renderSearchDialog({
				props: { open: true },
			});
			const select = await findByTestId('n8n-agent-search-provider-select');

			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('Existing search · Brave Search'));
			expect(queryByTestId('n8n-agent-search-connection-fields')).toBeNull();
			await fireEvent.click(getByTestId('n8n-agent-search-dialog-save'));

			await waitFor(() => expect(store.draft).toMatchObject({ searchCredentialId: 'brave-id' }));
			expect(testCredential).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'brave-id', type: 'braveSearchApi' }),
			);
			expect(save).toHaveBeenCalledOnce();
		});
	});

	describe('setup chain', () => {
		type ConnectionDraft = { type: string } | null | undefined;

		beforeEach(() => {
			vi.mocked(fetchInstanceModelCredentials).mockResolvedValue([
				{ id: 'openai-id', name: 'OpenAI account', type: 'openAiApi' },
			]);
			store.$patch({
				instanceModelCredentials: [{ id: 'openai-id', name: 'OpenAI account', type: 'openAiApi' }],
			});
			vi.spyOn(useCredentialsStore(), 'getCredentialData').mockResolvedValue({
				data: {},
			} as never);
			vi.spyOn(store, 'refreshInstanceModelCredentials').mockResolvedValue(undefined);
			vi.spyOn(store, 'refreshCredentials').mockResolvedValue(undefined);
			// Mimics the backend: connection payloads become credential assignments.
			vi.spyOn(store, 'save').mockImplementation(async () => {
				const draft = { ...store.draft } as Record<string, unknown>;
				const patch: Record<string, unknown> = {};
				for (const [key, value] of Object.entries(draft)) {
					if (!['modelConnection', 'sandboxConnection', 'searchConnection'].includes(key)) {
						patch[key] = value;
					}
				}
				const model = draft.modelConnection as ConnectionDraft;
				if (model !== undefined) {
					patch.modelCredentialId = model ? 'created-model-cred' : null;
					if (model && !store.instanceModelCredentials.some((c) => c.id === 'created-model-cred')) {
						store.instanceModelCredentials.push({
							id: 'created-model-cred',
							name: 'AI Assistant model',
							type: model.type,
						});
					}
				}
				const sandbox = draft.sandboxConnection as ConnectionDraft;
				if (sandbox !== undefined) {
					patch.daytonaCredentialId =
						sandbox?.type === 'daytonaApi' ? 'created-daytona-cred' : null;
					patch.n8nSandboxCredentialId =
						sandbox?.type === 'httpHeaderAuth' ? 'created-n8n-cred' : null;
					if (sandbox) {
						patch.sandboxProvider = sandbox.type === 'daytonaApi' ? 'daytona' : 'n8n-sandbox';
					}
				}
				store.$patch({
					settings: { ...store.settings!, ...patch },
				});
				for (const key of Object.keys(store.draft)) {
					delete (store.draft as Record<string, unknown>)[key];
				}
				return true;
			});
		});

		async function completeModelStep(
			findByTestId: (id: string) => Promise<HTMLElement>,
			getByTestId: (id: string) => HTMLElement,
			findByText: (text: string) => Promise<HTMLElement>,
		) {
			const select = await findByTestId('n8n-agent-model-provider-select');
			await fireEvent.click(select.querySelector('input')!);
			await fireEvent.click(await findByText('OpenAI'));
			const modelNameField = getByTestId('n8n-agent-model-name-input');
			const modelNameInput =
				modelNameField.tagName === 'INPUT'
					? (modelNameField as HTMLInputElement)
					: modelNameField.querySelector('input')!;
			await fireEvent.update(modelNameInput, 'gpt-4.1');
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));
		}

		async function completeSandboxStep(getByTestId: (id: string) => HTMLElement) {
			const apiKeyField = getByTestId('n8n-agent-sandbox-api-key-input');
			const apiKeyInput =
				apiKeyField.tagName === 'INPUT'
					? (apiKeyField as HTMLInputElement)
					: apiKeyField.querySelector('input')!;
			await fireEvent.update(apiKeyInput, 'sk-test');
			await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-save'));
		}

		it('chains model setup into the sandbox step when both are unconfigured', async () => {
			const { findByTestId, findByText, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-model-add'));
			expect(await findByTestId('n8n-agent-model-dialog-step')).toBeVisible();

			await completeModelStep(findByTestId, getByTestId, findByText);

			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-step')).toBeVisible());
			expect(queryByTestId('n8n-agent-sandbox-dialog-back')).toBeVisible();
		});

		it('enables only after the required setup completes', async () => {
			const disabledSettings = { ...store.settings!, enabled: false };
			store.$patch({ settings: disabledSettings });
			vi.mocked(fetchSettings).mockResolvedValue(disabledSettings);
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });
			const persistEnabled = vi.spyOn(store, 'persistEnabled').mockResolvedValue(true);
			const { findByTestId, findByText, getByRole, getByTestId } = renderComponent();

			await fireEvent.click(getByRole('button', { name: 'settings.n8nAgent.empty.enable' }));
			expect(await findByTestId('n8n-agent-model-dialog-step')).toBeVisible();
			expect(persistEnabled).not.toHaveBeenCalled();

			await completeModelStep(findByTestId, getByTestId, findByText);
			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-step')).toBeVisible());
			expect(persistEnabled).not.toHaveBeenCalled();

			const apiKeyField = getByTestId('n8n-agent-sandbox-api-key-input');
			const apiKeyInput =
				apiKeyField.tagName === 'INPUT'
					? (apiKeyField as HTMLInputElement)
					: apiKeyField.querySelector('input')!;
			await fireEvent.update(apiKeyInput, 'sk-test');
			await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-save'));

			await waitFor(() => expect(persistEnabled).toHaveBeenCalledWith(true));
		});

		it('stays disabled when setup is cancelled', async () => {
			const disabledSettings = { ...store.settings!, enabled: false };
			store.$patch({ settings: disabledSettings });
			vi.mocked(fetchSettings).mockResolvedValue(disabledSettings);
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });
			const persistEnabled = vi.spyOn(store, 'persistEnabled').mockResolvedValue(true);
			const { findByTestId, getByRole, getByTestId } = renderComponent();

			await fireEvent.click(getByRole('button', { name: 'settings.n8nAgent.empty.enable' }));
			await findByTestId('n8n-agent-model-dialog-step');
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-cancel'));

			expect(persistEnabled).not.toHaveBeenCalled();
			expect(store.settings?.enabled).toBe(false);
		});

		it('enables immediately when required setup is already complete', async () => {
			const disabledSettings = {
				...store.settings!,
				enabled: false,
				modelEnvConfigured: true,
				sandboxEnvConfigured: true,
			};
			store.$patch({ settings: disabledSettings });
			vi.mocked(fetchSettings).mockResolvedValue(disabledSettings);
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });
			const persistEnabled = vi.spyOn(store, 'persistEnabled').mockResolvedValue(true);
			const { getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-button'));

			expect(persistEnabled).toHaveBeenCalledWith(true);
		});

		it('retests a configured model credential before enabling', async () => {
			const disabledSettings = {
				...store.settings!,
				enabled: false,
				modelCredentialId: 'openai-id',
				modelName: 'gpt-4o',
				sandboxEnvConfigured: true,
			};
			store.$patch({
				settings: disabledSettings,
				instanceModelCredentials: [
					{ id: 'openai-id', name: 'AI Assistant model', type: 'openAiApi' },
				],
			});
			vi.mocked(fetchSettings).mockResolvedValue(disabledSettings);
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });

			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([
				{
					name: 'openAiApi',
					displayName: 'OpenAI',
					properties: [],
					test: { request: { url: '/models' } },
				},
			] satisfies ICredentialType[]);
			vi.spyOn(credentialsStore, 'getCredentialData').mockResolvedValue({
				data: { apiKey: '__blank' },
			} as never);
			const testCredential = vi
				.spyOn(credentialsStore, 'testCredential')
				.mockImplementationOnce(async ({ id }) => {
					credentialsStore.credentialTestResults.set(id, 'error');
					return { status: 'Error', message: 'Invalid API key' };
				})
				.mockImplementationOnce(async ({ id }) => {
					credentialsStore.credentialTestResults.set(id, 'success');
					return { status: 'OK', message: 'Connection successful' };
				});
			const persistEnabled = vi.spyOn(store, 'persistEnabled').mockResolvedValue(true);
			const { findByTestId, getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-enable-button'));

			expect(await findByTestId('n8n-agent-model-credential-test-error')).toBeVisible();
			expect(persistEnabled).not.toHaveBeenCalled();

			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));

			await waitFor(() => expect(persistEnabled).toHaveBeenCalledWith(true));
			expect(testCredential).toHaveBeenCalledTimes(2);
		});

		it('lets the user go back to step one and continue without changes', async () => {
			const { findByTestId, findByText, getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-model-add'));
			await completeModelStep(findByTestId, getByTestId, findByText);
			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-back')).toBeVisible());

			await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-back'));
			await waitFor(() => expect(getByTestId('n8n-agent-model-dialog-step')).toBeVisible());

			const continueButton = getByTestId('n8n-agent-model-dialog-save');
			await waitFor(() => expect(continueButton).not.toBeDisabled());
			await fireEvent.click(continueButton);
			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-step')).toBeVisible());
		});

		it('offers the optional search step after the sandbox step without gating enablement', async () => {
			const disabledSettings = { ...store.settings!, enabled: false };
			store.$patch({ settings: disabledSettings });
			vi.mocked(fetchSettings).mockResolvedValue(disabledSettings);
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });
			const persistEnabled = vi.spyOn(store, 'persistEnabled').mockResolvedValue(true);
			const { findByTestId, findByText, getByRole, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByRole('button', { name: 'settings.n8nAgent.empty.enable' }));
			await findByTestId('n8n-agent-model-dialog-step');
			await completeModelStep(findByTestId, getByTestId, findByText);
			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-step')).toBeVisible());
			await completeSandboxStep(getByTestId);

			await waitFor(() => expect(persistEnabled).toHaveBeenCalledWith(true));
			await waitFor(() => expect(getByTestId('n8n-agent-search-dialog-step')).toBeVisible());

			await fireEvent.click(getByTestId('n8n-agent-search-dialog-skip'));
			await waitFor(() => expect(queryByTestId('n8n-agent-search-dialog-step')).toBeNull());
			expect(store.settings?.searchCredentialId).toBeNull();
		});

		it('does not offer the search step when enabling fails', async () => {
			const disabledSettings = { ...store.settings!, enabled: false };
			store.$patch({ settings: disabledSettings });
			vi.mocked(fetchSettings).mockResolvedValue(disabledSettings);
			setModuleSettings(settingsStore, { ...defaultModuleSettings, enabled: false });
			const persistEnabled = vi.spyOn(store, 'persistEnabled').mockResolvedValue(false);
			const { findByTestId, findByText, getByRole, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByRole('button', { name: 'settings.n8nAgent.empty.enable' }));
			await findByTestId('n8n-agent-model-dialog-step');
			await completeModelStep(findByTestId, getByTestId, findByText);
			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-step')).toBeVisible());
			await completeSandboxStep(getByTestId);

			await waitFor(() => expect(persistEnabled).toHaveBeenCalledWith(true));
			await nextTick();
			expect(queryByTestId('n8n-agent-search-dialog-step')).toBeNull();
		});

		it('keeps the setup chain when navigating back from search to model', async () => {
			vi.mocked(fetchSettings).mockResolvedValue(store.settings!);
			const { findByTestId, findByText, getByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-model-add'));
			await completeModelStep(findByTestId, getByTestId, findByText);
			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-step')).toBeVisible());
			await completeSandboxStep(getByTestId);
			await waitFor(() => expect(getByTestId('n8n-agent-search-dialog-step')).toBeVisible());

			await fireEvent.click(getByTestId('n8n-agent-search-dialog-back'));
			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-step')).toBeVisible());
			await fireEvent.click(getByTestId('n8n-agent-sandbox-dialog-back'));
			await waitFor(() => expect(getByTestId('n8n-agent-model-dialog-step')).toBeVisible());
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));
			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-step')).toBeVisible());
		});

		it('skips the search step when search is already configured', async () => {
			store.$patch({
				settings: { ...store.settings!, searchEnvConfigured: true },
			});
			vi.mocked(fetchSettings).mockResolvedValue(store.settings!);
			const { findByTestId, findByText, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-model-add'));
			await completeModelStep(findByTestId, getByTestId, findByText);
			await waitFor(() => expect(getByTestId('n8n-agent-sandbox-dialog-step')).toBeVisible());
			await completeSandboxStep(getByTestId);

			await nextTick();
			expect(queryByTestId('n8n-agent-search-dialog-step')).toBeNull();
		});

		it('opens a plain dialog when only the model is missing', async () => {
			store.$patch({
				settings: { ...store.settings!, sandboxEnvConfigured: true },
			});
			const { findByTestId, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-model-add'));

			expect(await findByTestId('n8n-agent-model-provider-select')).toBeVisible();
			expect(queryByTestId('n8n-agent-model-dialog-step')).toBeNull();
		});

		it('opens a plain sandbox dialog when only the sandbox is missing', async () => {
			store.$patch({
				settings: { ...store.settings!, modelEnvConfigured: true },
			});
			const { findByTestId, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-sandbox-add'));

			expect(await findByTestId('n8n-agent-sandbox-provider-select')).toBeVisible();
			expect(queryByTestId('n8n-agent-sandbox-dialog-step')).toBeNull();
			expect(queryByTestId('n8n-agent-sandbox-dialog-back')).toBeNull();
		});

		it('editing the configured model row never chains into the sandbox step', async () => {
			const configured = {
				...store.settings!,
				modelCredentialId: 'openai-id',
				modelName: 'gpt-4o',
			};
			store.$patch({ settings: configured });
			vi.mocked(fetchSettings).mockResolvedValue(configured);
			const { findByTestId, getByTestId, queryByTestId } = renderComponent();

			await fireEvent.click(getByTestId('n8n-agent-model-row'));
			const modelNameField = await findByTestId('n8n-agent-model-name-input');
			expect(queryByTestId('n8n-agent-model-dialog-step')).toBeNull();

			const modelNameInput =
				modelNameField.tagName === 'INPUT'
					? (modelNameField as HTMLInputElement)
					: modelNameField.querySelector('input')!;
			await fireEvent.update(modelNameInput, 'gpt-4o-mini');
			await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));

			await nextTick();
			expect(queryByTestId('n8n-agent-sandbox-dialog-step')).toBeNull();
		});
	});

	describe('status row', () => {
		it('renders the enabled status action', () => {
			store.$patch({
				settings: {
					...store.settings!,
					modelCredentialId: 'openai-id',
					modelEnvConfigured: true,
					sandboxEnvConfigured: true,
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

		it('shows the configured model value once a credential pair is set', () => {
			store.$patch({
				settings: { ...store.settings!, modelCredentialId: 'openai-id', modelName: 'gpt-4o' },
				instanceModelCredentials: [{ id: 'openai-id', name: 'OpenAI', type: 'openAiApi' }],
			});

			const { getByText, queryByTestId } = renderComponent();
			expect(queryByTestId('n8n-agent-model-add')).toBeNull();
			expect(getByText('OpenAI · gpt-4o')).toBeVisible();
		});

		it('opens configuration for environment-managed search', async () => {
			store.$patch({ settings: { ...store.settings!, searchEnvConfigured: true } });

			const { getByText, getByTestId, findByTestId, queryByTestId } = renderComponent();
			expect(queryByTestId('n8n-agent-search-setup')).toBeNull();
			expect(getByText('settings.n8nAgent.search.env.value')).toBeVisible();

			await fireEvent.click(getByTestId('n8n-agent-search-row'));
			expect(await findByTestId('n8n-agent-search-provider-select')).toBeVisible();
		});

		it('fetches credential types on mount so deep links can render connection fields', () => {
			renderComponent();

			expect(fetchCredentialTypesSpy).toHaveBeenCalledWith(false);
		});

		it('hides credential rows on managed deployments', () => {
			setModuleSettings(settingsStore, { ...defaultModuleSettings, proxyEnabled: true });

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
