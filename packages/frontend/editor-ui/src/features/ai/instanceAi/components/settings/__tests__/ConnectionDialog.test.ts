import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiSettingsStore } from '../../../instanceAiSettings.store';
import ConnectionDialog from '../ConnectionDialog.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ addEventListener: vi.fn() }),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(true),
}));

const renderDialog = createComponentRenderer(ConnectionDialog);

function inputFor(element: HTMLElement): HTMLInputElement {
	if (element instanceof HTMLInputElement) return element;
	const input = element.querySelector('input');
	if (!input) throw new Error('Expected an input');
	return input;
}

describe('ConnectionDialog', () => {
	let store: ReturnType<typeof useInstanceAiSettingsStore>;
	let credentialsStore: ReturnType<typeof useCredentialsStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		store = useInstanceAiSettingsStore();
		credentialsStore = useCredentialsStore();
		credentialsStore.setCredentialTypes([
			{ name: 'anthropicApi', displayName: 'Anthropic', properties: [] },
			{ name: 'openAiApi', displayName: 'OpenAI', properties: [] },
			{ name: 'openRouterApi', displayName: 'OpenRouter', properties: [] },
			{ name: 'daytonaApi', displayName: 'Daytona', properties: [] },
			{ name: 'searXngApi', displayName: 'SearXNG', properties: [] },
			{ name: 'braveSearchApi', displayName: 'Brave Search', properties: [] },
		] as never);
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
				searchDisabled: false,
				n8nSandboxServiceUrl: null,
				envManaged: {
					model: { provider: false, apiKey: false, baseUrl: false, model: false },
					sandbox: { provider: false, serviceUrl: false, apiKey: false },
					search: { provider: false, apiKey: false, url: false },
				},
				localGatewayDisabled: false,
			} as never,
		});
		vi.spyOn(store, 'save').mockResolvedValue(true);
		vi.spyOn(store, 'refreshCredentials').mockResolvedValue(undefined);
		vi.spyOn(store, 'refreshInstanceModelCredentials').mockResolvedValue(undefined);
	});

	it('uses Cancel and Save without onboarding progress in both direct and setup contexts', async () => {
		const direct = renderDialog({ props: { kind: 'search', open: true } });

		expect(await direct.findByTestId('n8n-agent-search-dialog-cancel')).toBeVisible();
		expect(direct.getByTestId('n8n-agent-search-dialog-save')).toBeVisible();
		expect(direct.queryByTestId('n8n-agent-search-dialog-step')).toBeNull();
		expect(direct.queryByTestId('n8n-agent-search-dialog-back')).toBeNull();
		direct.unmount();

		const setup = renderDialog({ props: { kind: 'search', open: true, setup: true } });
		expect(await setup.findByTestId('n8n-agent-search-dialog-cancel')).toBeVisible();
		expect(setup.getByTestId('n8n-agent-search-dialog-save')).toBeVisible();
		expect(setup.queryByTestId('n8n-agent-search-dialog-step')).toBeNull();
		expect(setup.queryByTestId('n8n-agent-search-dialog-back')).toBeNull();
	});

	it('uses the same provider and model dropdowns as onboarding', async () => {
		const { findByTestId, findByText, getByTestId, queryByTestId } = renderDialog({
			props: { kind: 'model', open: true },
		});

		const provider = await findByTestId('n8n-agent-model-provider-select');
		expect(getByTestId('n8n-agent-model-name-input')).toBeVisible();
		expect(queryByTestId('assistant-model-base-url')).toBeNull();

		await fireEvent.click(inputFor(provider));
		await fireEvent.click(await findByText('instanceAi.onboarding.model.customProvider'));
		expect(getByTestId('assistant-model-base-url')).toBeVisible();
	});

	it('does not render an empty existing-credential selector for a fresh connection', async () => {
		const { findByTestId, queryByTestId } = renderDialog({
			props: { kind: 'sandbox', open: true },
		});

		expect(await findByTestId('n8n-agent-sandbox-provider-select')).toBeVisible();
		expect(queryByTestId('n8n-agent-sandbox-existing-credential-select')).toBeNull();
	});

	it('assigns a selected compatible credential', async () => {
		store.$patch({
			instanceModelCredentials: [
				{ id: 'anthropic-id', name: 'Existing Anthropic', type: 'anthropicApi' },
				{ id: 'openai-id', name: 'Existing OpenAI', type: 'openAiApi' },
			],
		});
		const { emitted, findByTestId, findByText, getByTestId } = renderDialog({
			props: { kind: 'model', open: true },
		});

		const existing = await findByTestId('n8n-agent-model-existing-credential-select');
		await fireEvent.click(inputFor(existing));
		await fireEvent.click(await findByText('Existing Anthropic · Anthropic'));
		await fireEvent.click(getByTestId('n8n-agent-model-dialog-save'));

		await waitFor(() => expect(emitted().saved).toEqual([[]]));
		expect(store.setField).toHaveBeenCalledWith('modelCredentialId', 'anthropic-id');
		expect(store.setField).toHaveBeenCalledWith('modelName', 'claude-opus-5');
		expect(emitted()['update:open']).toContainEqual([false]);
	});

	it('shows environment-managed settings as active and read-only', async () => {
		store.$patch({
			settings: {
				...store.settings!,
				sandboxEnvConfigured: true,
				envManaged: {
					...store.settings!.envManaged,
					sandbox: { provider: true, serviceUrl: true, apiKey: true },
				},
			},
		});
		const { findByText, getByTestId, queryByTestId } = renderDialog({
			props: { kind: 'sandbox', open: true },
		});

		expect(await findByText('instanceAi.onboarding.env.title')).toBeVisible();
		expect(queryByTestId('n8n-agent-sandbox-provider-select')).toBeNull();
		expect(getByTestId('n8n-agent-sandbox-dialog-save')).toBeDisabled();
	});

	it('keeps setup open after save so the parent can move to the next connection', async () => {
		vi.spyOn(store, 'verifySearch').mockResolvedValue({ ok: true });
		const { emitted, findByTestId, getByTestId } = renderDialog({
			props: { kind: 'search', open: true, setup: true },
		});

		await fireEvent.click(await findByTestId('assistant-search-disabled'));
		await fireEvent.click(getByTestId('n8n-agent-search-dialog-save'));

		await waitFor(() => expect(emitted().saved).toEqual([[]]));
		expect(emitted()['update:open']).toBeUndefined();
	});
});
