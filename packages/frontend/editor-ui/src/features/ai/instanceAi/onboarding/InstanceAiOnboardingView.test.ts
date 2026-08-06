import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { defineComponent } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

import InstanceAiOnboardingView from './InstanceAiOnboardingView.vue';

const confirmMock = vi.hoisted(() => vi.fn());
const showMessageMock = vi.hoisted(() => vi.fn());
const routerPushMock = vi.hoisted(() => vi.fn());

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: confirmMock }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageMock }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ addEventListener: vi.fn() }),
}));

const IntroStub = defineComponent({
	name: 'InstanceAiOnboardingIntro',
	props: {
		incomplete: Boolean,
		connectModelOnly: Boolean,
		modelValue: String,
		sandboxValue: String,
		searchValue: String,
	},
	emits: ['setup', 'openStep', 'turnOff'],
	template: `
		<div
			data-test-id="intro-stub"
			:data-incomplete="String(incomplete)"
			:data-connect-model-only="String(connectModelOnly)"
			:data-model-value="modelValue"
			:data-sandbox-value="sandboxValue"
			:data-search-value="searchValue"
		>
			<button data-test-id="intro-setup" @click="$emit('setup')" />
			<button data-test-id="intro-open-model" @click="$emit('openStep', 'model')" />
			<button data-test-id="intro-open-search" @click="$emit('openStep', 'search')" />
			<button data-test-id="intro-turn-off" @click="$emit('turnOff')" />
		</div>
	`,
});

const WizardStub = defineComponent({
	name: 'InstanceAiOnboardingWizard',
	props: {
		open: Boolean,
		step: String,
		editMode: Boolean,
		composeFastPath: Boolean,
	},
	emits: ['update:open', 'advance', 'back', 'edit', 'completed'],
	template: `
		<div
			data-test-id="wizard-stub"
			:data-open="String(open)"
			:data-step="step"
			:data-edit-mode="String(editMode)"
			:data-compose-fast-path="String(composeFastPath)"
		>
			<button data-test-id="wizard-open" @click="$emit('update:open', true)" />
			<button data-test-id="wizard-close" @click="$emit('update:open', false)" />
			<button data-test-id="wizard-advance" @click="$emit('advance')" />
			<button data-test-id="wizard-back" @click="$emit('back')" />
			<button data-test-id="wizard-edit-sandbox" @click="$emit('edit', 'sandbox')" />
			<button data-test-id="wizard-complete" @click="$emit('completed')" />
		</div>
	`,
});

const renderView = createComponentRenderer(InstanceAiOnboardingView, {
	global: {
		stubs: {
			InstanceAiOnboardingIntro: IntroStub,
			InstanceAiOnboardingWizard: WizardStub,
		},
	},
});

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
	vi.mocked(store.fetch).mockResolvedValue(undefined);
	vi.mocked(store.persistEnabled).mockResolvedValue(true);
	const credentialsStore = useCredentialsStore();
	vi.mocked(credentialsStore.fetchCredentialTypes).mockResolvedValue(undefined as never);
	return { pinia, store, credentialsStore };
}

describe('InstanceAiOnboardingView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches setup data and opens at the first unmet step', async () => {
		const { pinia, store, credentialsStore } = setupStore();
		const { getByTestId } = renderView({ pinia });

		await waitFor(() => expect(store.fetch).toHaveBeenCalled());
		expect(credentialsStore.fetchCredentialTypes).toHaveBeenCalledWith(false);
		expect(getByTestId('intro-stub')).toHaveAttribute('data-incomplete', 'false');

		await fireEvent.click(getByTestId('intro-setup'));
		expect(getByTestId('wizard-stub')).toHaveAttribute('data-open', 'true');
		expect(getByTestId('wizard-stub')).toHaveAttribute('data-step', 'model');
	});

	it('shows saved setup progress and opens a selected checklist step', async () => {
		const { pinia, store } = setupStore({
			modelCredentialId: 'model-credential',
			modelName: 'claude-opus-5',
		});
		store.$patch({
			instanceModelCredentials: [
				{ id: 'model-credential', name: 'Anthropic', type: 'anthropicApi' },
			],
		});
		const { getByTestId } = renderView({ pinia });

		expect(getByTestId('intro-stub')).toHaveAttribute('data-incomplete', 'true');
		expect(getByTestId('intro-stub')).toHaveAttribute(
			'data-model-value',
			'anthropic/claude-opus-5',
		);

		await fireEvent.click(getByTestId('intro-open-search'));
		expect(getByTestId('wizard-stub')).toHaveAttribute('data-step', 'search');
		expect(getByTestId('wizard-stub')).toHaveAttribute('data-open', 'true');
		expect(getByTestId('wizard-stub')).toHaveAttribute('data-edit-mode', 'true');
	});

	it('uses the model-only fast path when sandbox and search are server-managed', async () => {
		const { pinia } = setupStore({
			sandboxEnabled: true,
			sandboxEnvConfigured: true,
			searchEnvConfigured: true,
		});
		const { getByTestId } = renderView({ pinia });

		expect(getByTestId('intro-stub')).toHaveAttribute('data-connect-model-only', 'true');
		expect(getByTestId('intro-stub')).toHaveAttribute(
			'data-sandbox-value',
			'instanceAi.onboarding.foundOnServer',
		);
		expect(getByTestId('intro-stub')).toHaveAttribute(
			'data-search-value',
			'instanceAi.onboarding.foundOnServer',
		);
	});

	it('requires the sandbox step when server configuration is present but disabled', async () => {
		const { pinia } = setupStore({
			modelEnvConfigured: true,
			sandboxEnabled: false,
			sandboxEnvConfigured: true,
			searchEnvConfigured: true,
		});
		const { getByTestId } = renderView({ pinia });

		expect(getByTestId('intro-stub')).toHaveAttribute('data-connect-model-only', 'false');

		await fireEvent.click(getByTestId('intro-setup'));
		expect(getByTestId('wizard-stub')).toHaveAttribute('data-step', 'sandbox');
	});

	it('labels configured Daytona and Brave connections and opens summary edits', async () => {
		const { pinia, store } = setupStore({
			modelCredentialId: 'model-credential',
			modelName: 'custom-model',
			sandboxEnabled: true,
			sandboxProvider: 'daytona',
			daytonaCredentialId: 'sandbox-credential',
			searchCredentialId: 'search-credential',
		});
		store.$patch({
			instanceModelCredentials: [
				{ id: 'model-credential', name: 'Custom', type: 'customCredential' },
			],
			serviceCredentials: [{ id: 'search-credential', name: 'Brave', type: 'braveSearchApi' }],
		});
		const { getByTestId } = renderView({ pinia });

		expect(getByTestId('intro-stub')).toHaveAttribute('data-model-value', 'custom-model');
		expect(getByTestId('intro-stub')).toHaveAttribute('data-sandbox-value', 'Daytona');
		expect(getByTestId('intro-stub')).toHaveAttribute('data-search-value', 'Brave Search');

		await fireEvent.click(getByTestId('intro-setup'));
		await fireEvent.click(getByTestId('wizard-edit-sandbox'));
		expect(getByTestId('wizard-stub')).toHaveAttribute('data-step', 'sandbox');
		expect(getByTestId('wizard-stub')).toHaveAttribute('data-edit-mode', 'true');
		await fireEvent.click(getByTestId('wizard-open'));
		expect(getByTestId('wizard-stub')).toHaveAttribute('data-open', 'true');
	});

	it('emits completion only when setup is actually complete', async () => {
		const incomplete = setupStore({ modelEnvConfigured: true });
		const incompleteView = renderView({ pinia: incomplete.pinia });
		await fireEvent.click(incompleteView.getByTestId('intro-setup'));
		await fireEvent.click(incompleteView.getByTestId('wizard-complete'));
		expect(incompleteView.emitted().completed).toBeUndefined();
		await fireEvent.click(incompleteView.getByTestId('wizard-close'));
		expect(incompleteView.emitted().completed).toBeUndefined();
		expect(incompleteView.getByTestId('wizard-stub')).toHaveAttribute('data-open', 'false');
		incompleteView.unmount();

		const complete = setupStore({
			modelEnvConfigured: true,
			sandboxEnabled: true,
			sandboxEnvConfigured: true,
			searchDisabled: true,
		});
		const completeView = renderView({ pinia: complete.pinia });
		await fireEvent.click(completeView.getByTestId('intro-setup'));
		await fireEvent.click(completeView.getByTestId('wizard-close'));
		expect(completeView.emitted().completed).toEqual([[]]);
		expect(completeView.getByTestId('wizard-stub')).toHaveAttribute('data-open', 'false');
	});

	it('keeps the assistant enabled when turn-off is cancelled', async () => {
		const { pinia, store } = setupStore();
		confirmMock.mockResolvedValue('cancel');
		const { getByTestId } = renderView({ pinia });

		await fireEvent.click(getByTestId('intro-turn-off'));

		await waitFor(() => expect(confirmMock).toHaveBeenCalled());
		expect(store.persistEnabled).not.toHaveBeenCalled();
		expect(routerPushMock).not.toHaveBeenCalled();
	});

	it('turns off the assistant, confirms with a toast, and returns home', async () => {
		const { pinia, store } = setupStore();
		confirmMock.mockResolvedValue(MODAL_CONFIRM);
		vi.mocked(store.persistEnabled).mockResolvedValue(true);
		const { getByTestId } = renderView({ pinia });

		await fireEvent.click(getByTestId('intro-turn-off'));

		await waitFor(() => expect(store.persistEnabled).toHaveBeenCalledWith(false, false));
		expect(showMessageMock).toHaveBeenCalledWith({
			title: 'instanceAi.onboarding.turnOff.toastTitle',
			message: 'instanceAi.onboarding.turnOff.toastDescription',
			type: 'success',
		});
		expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
	});
});
