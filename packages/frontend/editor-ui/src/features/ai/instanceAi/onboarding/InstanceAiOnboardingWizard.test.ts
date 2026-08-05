import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';

import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

import InstanceAiOnboardingWizard from './InstanceAiOnboardingWizard.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ addEventListener: vi.fn() }),
}));

const renderWizard = createComponentRenderer(InstanceAiOnboardingWizard, {
	props: {
		open: true,
		step: 'model',
		editMode: false,
		sequence: ['model', 'sandbox', 'search', 'done'],
		modelValue: 'anthropic/claude-opus-5',
		sandboxValue: 'n8n Sandbox',
		searchValue: 'Disabled',
		composeFastPath: false,
	},
});

function inputFor(element: HTMLElement): HTMLInputElement {
	if (element instanceof HTMLInputElement) return element;
	const input = element.querySelector('input');
	if (!input) throw new Error('Expected an input');
	return input;
}

function setupStore(overrides: Record<string, unknown> = {}) {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const store = useInstanceAiSettingsStore();
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
			...overrides,
		} as never,
	});
	vi.mocked(store.save).mockResolvedValue(true);
	vi.mocked(store.refreshCredentials).mockResolvedValue(undefined);
	vi.mocked(store.refreshInstanceModelCredentials).mockResolvedValue(undefined);
	return { pinia, store, credentialsStore: useCredentialsStore() };
}

describe('InstanceAiOnboardingWizard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('verifies and saves a model connection before advancing', async () => {
		const { pinia, store } = setupStore();
		vi.mocked(store.verifyModel).mockResolvedValue({ ok: true, latencyMs: 125 });
		const { emitted, findByTestId, getByTestId, getByText } = renderWizard({ pinia });
		const primary = await findByTestId('wizard-primary');

		expect(primary).toBeDisabled();
		await fireEvent.update(inputFor(getByTestId('assistant-model-api-key')), ' model-key ');
		await waitFor(() => expect(primary).not.toBeDisabled());
		await fireEvent.click(primary);

		await waitFor(() =>
			expect(store.verifyModel).toHaveBeenCalledWith({
				connection: { type: 'anthropicApi', data: { apiKey: 'model-key' } },
				modelName: 'claude-opus-5',
			}),
		);
		expect(store.setField).toHaveBeenCalledWith('modelConnection', {
			type: 'anthropicApi',
			data: { apiKey: 'model-key' },
		});
		expect(store.setField).toHaveBeenCalledWith('modelName', 'claude-opus-5');
		expect(store.save).toHaveBeenCalledWith(false);
		expect(store.refreshInstanceModelCredentials).toHaveBeenCalled();
		expect(getByText('instanceAi.onboarding.model.success')).toBeVisible();
		await waitFor(() => expect(emitted().advance).toEqual([[]]));
	});

	it('keeps the model step open on verification failure and clears the error after editing', async () => {
		const { pinia, store } = setupStore();
		vi.mocked(store.verifyModel).mockResolvedValue({ ok: false, failure: 'unauthorized' });
		const { emitted, findByTestId, getByTestId, queryByTestId } = renderWizard({ pinia });
		const apiKey = inputFor(await findByTestId('assistant-model-api-key'));

		await fireEvent.update(apiKey, 'wrong-key');
		await fireEvent.click(getByTestId('wizard-primary'));
		await waitFor(() => expect(getByTestId('assistant-verification-error')).toBeVisible());
		expect(store.save).not.toHaveBeenCalled();
		expect(emitted().advance).toBeUndefined();

		await fireEvent.update(apiKey, 'new-key');
		await waitFor(() => expect(queryByTestId('assistant-verification-error')).toBeNull());
	});

	it('verifies an environment-managed model without sending a connection', async () => {
		const { pinia, store } = setupStore({
			modelName: 'claude-opus-5',
			modelEnvConfigured: true,
			sandboxEnvConfigured: true,
			envManaged: {
				model: { provider: true, apiKey: true, baseUrl: false, model: false },
				sandbox: { provider: true, serviceUrl: true, apiKey: true },
				search: { provider: false, apiKey: false, url: false },
			},
		});
		vi.mocked(store.verifyModel).mockResolvedValue({ ok: true, latencyMs: 10 });
		const { emitted, findByText, getByTestId } = renderWizard({ pinia });

		expect(await findByText('instanceAi.onboarding.env.title')).toBeVisible();
		await fireEvent.click(getByTestId('wizard-primary'));

		await waitFor(() =>
			expect(store.verifyModel).toHaveBeenCalledWith({ modelName: 'claude-opus-5' }),
		);
		expect(store.setField).toHaveBeenCalledWith('modelName', 'claude-opus-5');
		expect(store.setField).toHaveBeenCalledWith('sandboxEnabled', true);
		await waitFor(() => expect(emitted().advance).toEqual([[]]));
	});

	it('supports a custom OpenAI-compatible model without an API key', async () => {
		const { pinia, store } = setupStore();
		vi.mocked(store.verifyModel).mockResolvedValue({ ok: true });
		const { findByTestId, findByText, getByTestId } = renderWizard({ pinia });

		const providerSelect = await findByTestId('assistant-model-provider');
		await fireEvent.click(inputFor(providerSelect));
		await fireEvent.click(await findByText('instanceAi.onboarding.model.customProvider'));
		await fireEvent.update(
			inputFor(getByTestId('assistant-model-base-url')),
			' http://ollama:11434/v1 ',
		);
		await fireEvent.update(inputFor(getByTestId('assistant-model-name')), ' qwen3-coder ');
		await fireEvent.click(getByTestId('wizard-primary'));

		await waitFor(() =>
			expect(store.verifyModel).toHaveBeenCalledWith({
				connection: { type: 'openAiApi', data: { url: 'http://ollama:11434/v1' } },
				modelName: 'qwen3-coder',
			}),
		);
	});

	it('verifies and saves an n8n Sandbox connection', async () => {
		const { pinia, store } = setupStore();
		vi.mocked(store.verifySandbox).mockResolvedValue({ ok: true, startupMs: 1500 });
		const { emitted, findByTestId, getByTestId, getByText } = renderWizard({
			pinia,
			props: { step: 'sandbox' },
		});

		await fireEvent.click(await findByTestId('assistant-sandbox-n8n-sandbox'));
		await fireEvent.update(inputFor(getByTestId('assistant-sandbox-url')), ' http://sandbox:3200 ');
		await fireEvent.update(inputFor(getByTestId('assistant-sandbox-api-key')), ' sandbox-key ');
		await fireEvent.click(getByTestId('wizard-primary'));

		const connection = {
			type: 'httpHeaderAuth',
			data: { name: 'x-api-key', value: 'sandbox-key' },
		};
		await waitFor(() =>
			expect(store.verifySandbox).toHaveBeenCalledWith({
				provider: 'n8n-sandbox',
				connection,
				serviceUrl: 'http://sandbox:3200',
			}),
		);
		expect(store.setField).toHaveBeenCalledWith('sandboxConnection', connection);
		expect(store.setField).toHaveBeenCalledWith('sandboxProvider', 'n8n-sandbox');
		expect(store.setField).toHaveBeenCalledWith('sandboxEnabled', true);
		expect(store.setField).toHaveBeenCalledWith('n8nSandboxServiceUrl', 'http://sandbox:3200');
		expect(store.refreshCredentials).toHaveBeenCalled();
		expect(getByText('instanceAi.onboarding.sandbox.success')).toBeVisible();
		await waitFor(() => expect(emitted().advance).toEqual([[]]));
	});

	it('hydrates and verifies a saved Daytona connection', async () => {
		const { pinia, store, credentialsStore } = setupStore({
			sandboxProvider: 'daytona',
			daytonaCredentialId: 'daytona-credential',
		});
		vi.mocked(credentialsStore.getCredentialData).mockResolvedValue({
			data: { apiKey: 'saved-daytona-key' },
		} as never);
		vi.mocked(store.verifySandbox).mockResolvedValue({ ok: true });
		const { getByTestId } = renderWizard({ pinia, props: { step: 'sandbox' } });

		await waitFor(() =>
			expect(inputFor(getByTestId('assistant-daytona-api-key')).value).toBe('saved-daytona-key'),
		);
		await fireEvent.update(
			inputFor(getByTestId('assistant-daytona-api-key')),
			'updated-daytona-key',
		);
		await fireEvent.click(getByTestId('wizard-primary'));

		await waitFor(() =>
			expect(store.verifySandbox).toHaveBeenCalledWith({
				provider: 'daytona',
				connection: {
					type: 'daytonaApi',
					data: {
						apiUrl: 'https://app.daytona.io/api',
						apiKey: 'updated-daytona-key',
					},
				},
			}),
		);
	});

	it('confirms an environment-managed sandbox and enables it', async () => {
		const { pinia, store } = setupStore({
			sandboxProvider: 'n8n-sandbox',
			sandboxEnvConfigured: true,
		});
		vi.mocked(store.verifySandbox).mockResolvedValue({ ok: true });
		const { emitted, findByText, getByTestId } = renderWizard({
			pinia,
			props: { step: 'sandbox' },
		});

		expect(await findByText('instanceAi.onboarding.env.title')).toBeVisible();
		await fireEvent.click(getByTestId('wizard-primary'));

		await waitFor(() =>
			expect(store.verifySandbox).toHaveBeenCalledWith({ provider: 'n8n-sandbox' }),
		);
		expect(store.setField).toHaveBeenCalledWith('sandboxEnabled', true);
		expect(store.save).toHaveBeenCalledWith(false);
		await waitFor(() => expect(emitted().advance).toEqual([[]]));
	});

	it('records disabled web search without calling verification', async () => {
		const { pinia, store } = setupStore();
		const { emitted, findByTestId, findByText, getByTestId } = renderWizard({
			pinia,
			props: { step: 'search' },
		});

		expect(
			(await findByText('instanceAi.onboarding.search.free')).closest('.n8n-badge'),
		).not.toBeNull();
		await fireEvent.click(await findByTestId('assistant-search-disabled'));
		await fireEvent.click(getByTestId('wizard-primary'));

		await waitFor(() => expect(store.save).toHaveBeenCalledWith(false));
		expect(store.verifySearch).not.toHaveBeenCalled();
		expect(store.setField).toHaveBeenCalledWith('searchDisabled', true);
		expect(store.refreshCredentials).toHaveBeenCalled();
		await waitFor(() => expect(emitted().advance).toEqual([[]]));
	});

	it('accepts environment-managed search without sending or saving credentials', async () => {
		const { pinia, store } = setupStore({ searchEnvConfigured: true });
		const { emitted, findByText, getByTestId } = renderWizard({
			pinia,
			props: { step: 'search' },
		});

		expect(await findByText('instanceAi.onboarding.env.title')).toBeVisible();
		await fireEvent.click(getByTestId('wizard-primary'));

		await waitFor(() => expect(emitted().advance).toEqual([[]]));
		expect(store.verifySearch).not.toHaveBeenCalled();
		expect(store.save).not.toHaveBeenCalled();
	});

	it.each([
		['searxng', 'searXngApi', 'apiUrl', 'http://searxng:8080'],
		['brave', 'braveSearchApi', 'apiKey', 'brave-key'],
	] as const)('verifies and saves a %s search connection', async (provider, type, field, value) => {
		const { pinia, store } = setupStore();
		vi.mocked(store.verifySearch).mockResolvedValue({ ok: true, resultCount: 10 });
		const { emitted, findByTestId, getByTestId, getByText } = renderWizard({
			pinia,
			props: { step: 'search' },
		});

		await fireEvent.click(await findByTestId(`assistant-search-${provider}`));
		await fireEvent.update(inputFor(getByTestId('assistant-search-value')), ` ${value} `);
		await fireEvent.click(getByTestId('wizard-primary'));

		const connection = { type, data: { [field]: value } };
		await waitFor(() => expect(store.verifySearch).toHaveBeenCalledWith({ connection }));
		expect(store.setField).toHaveBeenCalledWith('searchConnection', connection);
		expect(store.setField).toHaveBeenCalledWith('searchDisabled', false);
		expect(getByText('instanceAi.onboarding.search.success')).toBeVisible();
		await waitFor(() => expect(emitted().advance).toEqual([[]]));
	});

	it('hydrates a saved search credential and handles verification errors', async () => {
		const { pinia, store, credentialsStore } = setupStore({
			searchCredentialId: 'search-credential',
		});
		store.$patch({
			serviceCredentials: [
				{ id: 'search-credential', name: 'Brave Search', type: 'braveSearchApi' },
			],
		});
		vi.mocked(credentialsStore.getCredentialData).mockResolvedValue({
			data: { apiKey: 'saved-search-key' },
		} as never);
		vi.mocked(store.verifySearch).mockRejectedValue(new Error('request failed'));
		const { emitted, findByText, getByTestId } = renderWizard({
			pinia,
			props: { step: 'search' },
		});

		await waitFor(() =>
			expect(inputFor(getByTestId('assistant-search-value')).value).toBe('saved-search-key'),
		);
		await fireEvent.click(getByTestId('wizard-primary'));

		expect(await findByText('instanceAi.onboarding.verification.provider_error')).toBeVisible();
		expect(store.save).not.toHaveBeenCalled();
		expect(emitted().advance).toBeUndefined();
	});

	it('opens summary rows for editing and completes from the done step', async () => {
		const { pinia } = setupStore();
		const { emitted, findByText, getByTestId } = renderWizard({
			pinia,
			props: { step: 'done' },
		});

		await fireEvent.click(
			(await findByText('instanceAi.onboarding.model.label')).closest('button')!,
		);
		await fireEvent.click(
			(await findByText('instanceAi.onboarding.sandbox.label')).closest('button')!,
		);
		await fireEvent.click(
			(await findByText('instanceAi.onboarding.search.label')).closest('button')!,
		);
		await fireEvent.click(getByTestId('wizard-primary'));

		expect(emitted().edit).toEqual([['model'], ['sandbox'], ['search']]);
		expect(emitted().completed).toEqual([[]]);
	});

	it('completes from the compact compose fast path', async () => {
		const { pinia } = setupStore();
		const { emitted, findByTestId, queryByText } = renderWizard({
			pinia,
			props: { step: 'done', composeFastPath: true },
		});

		expect(queryByText('anthropic/claude-opus-5')).toBeNull();
		await fireEvent.click(await findByTestId('wizard-primary'));
		expect(emitted().completed).toEqual([[]]);
	});

	it('emits back from later setup steps', async () => {
		const { pinia } = setupStore();
		const { emitted, findByTestId } = renderWizard({
			pinia,
			props: { step: 'sandbox' },
		});

		expect(await findByTestId('wizard-progress')).toBeVisible();
		await fireEvent.click(await findByTestId('wizard-back'));

		expect(emitted().back).toEqual([[]]);
	});

	it('uses cancel and save without progress controls in direct edit mode', async () => {
		const { pinia } = setupStore();
		const { emitted, findByTestId, findByText, queryByTestId } = renderWizard({
			pinia,
			props: { step: 'search', editMode: true },
		});

		expect(await findByText('generic.save')).toBeVisible();
		expect(queryByTestId('wizard-back')).toBeNull();
		expect(queryByTestId('wizard-progress')).toBeNull();

		await fireEvent.click(await findByTestId('wizard-cancel'));

		expect(emitted()['update:open']).toEqual([[false]]);
	});
});
