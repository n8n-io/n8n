import { flushPromises, shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { i18nInstance } from '@n8n/i18n';
import { N8nPlugin } from '@n8n/design-system';

import RecipeCredentialSetup from './RecipeCredentialSetup.vue';
import ManagedOAuthSetup from './ManagedOAuthSetup.vue';
import TenantOAuthSetup from './TenantOAuthSetup.vue';
import type { RecipeActivation } from '../credentialsSetup.types';

// ---------------------------------------------------------------------------
// Store/composable mocks
// ---------------------------------------------------------------------------

const mockTrackRecipeEvent = vi.fn();
const mockGetRecipeActivation = vi.fn();

vi.mock('../stores/credentialSetupRecipe.store', () => ({
	useCredentialSetupRecipeStore: () => ({
		trackRecipeEvent: mockTrackRecipeEvent,
		getRecipeActivation: mockGetRecipeActivation,
	}),
}));

const mockGetCredentialTypeByName = vi.fn();

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialTypeByName: mockGetCredentialTypeByName,
	}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActivation(setupMode: string, preSteps: unknown[] = []): RecipeActivation {
	return {
		resolved: {
			recipe: {
				setupMode: setupMode as RecipeActivation['resolved']['recipe']['setupMode'],
				friction: 'one_click',
				preSteps: preSteps as RecipeActivation['resolved']['recipe']['preSteps'],
			},
			confidence: 'high',
			confidenceReasons: ['explicit_override'],
			resolutionSource: 'explicit_override',
			credentialType: 'testApi',
		},
		activated: true,
		activationGates: { inExperiment: true, inV1Cohort: true, confidenceMet: true },
	};
}

const globalPlugins = {
	plugins: [i18nInstance, N8nPlugin],
	stubs: {
		ManagedOAuthSetup: true,
		TenantOAuthSetup: true,
	},
};

function mountComponent(setupMode: string, preSteps: unknown[] = []) {
	mockGetRecipeActivation.mockReturnValue(makeActivation(setupMode, preSteps));
	mockGetCredentialTypeByName.mockReturnValue({ displayName: 'Test API' });

	return shallowMount(RecipeCredentialSetup, {
		props: { credentialTypeName: 'testApi' },
		global: globalPlugins,
	});
}

// ---------------------------------------------------------------------------
// Tests: RecipeCredentialSetup routing
// ---------------------------------------------------------------------------

describe('RecipeCredentialSetup', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({ createSpy: vi.fn });
		setActivePinia(pinia);
		vi.clearAllMocks();
	});

	describe('routing by setupMode', () => {
		it('renders ManagedOAuthSetup when setupMode is managedOAuth', () => {
			const wrapper = mountComponent('managedOAuth');
			expect(wrapper.findComponent(ManagedOAuthSetup).exists()).toBe(true);
			expect(wrapper.findComponent(TenantOAuthSetup).exists()).toBe(false);
		});

		it('renders TenantOAuthSetup when setupMode is tenantOAuth', () => {
			const wrapper = mountComponent('tenantOAuth', [
				{ kind: 'field', field: 'subdomain', label: 'Subdomain' },
			]);
			expect(wrapper.findComponent(TenantOAuthSetup).exists()).toBe(true);
			expect(wrapper.findComponent(ManagedOAuthSetup).exists()).toBe(false);
		});

		it('passes correct bootstrapField and bootstrapFieldLabel props to TenantOAuthSetup', () => {
			const wrapper = mountComponent('tenantOAuth', [
				{ kind: 'field', field: 'subdomain', label: 'Your Subdomain' },
			]);
			const tenantSetup = wrapper.findComponent(TenantOAuthSetup);
			expect(tenantSetup.props('bootstrapField')).toBe('subdomain');
			expect(tenantSetup.props('bootstrapFieldLabel')).toBe('Your Subdomain');
		});

		it('uses field name as label when label is not provided', () => {
			const wrapper = mountComponent('tenantOAuth', [{ kind: 'field', field: 'apiKey' }]);
			const tenantSetup = wrapper.findComponent(TenantOAuthSetup);
			expect(tenantSetup.props('bootstrapField')).toBe('apiKey');
			expect(tenantSetup.props('bootstrapFieldLabel')).toBe('apiKey');
		});

		it('emits manual-fallback with "unsupported" when setupMode is tokenManual', async () => {
			const wrapper = mountComponent('tokenManual');
			await flushPromises();
			const emitted = wrapper.emitted('manual-fallback');
			expect(emitted).toBeDefined();
			expect(emitted![0]).toEqual(['unsupported']);
		});

		it('renders nothing interactive when setupMode is unsupported', async () => {
			const wrapper = mountComponent('generic');
			await flushPromises();
			expect(wrapper.findComponent(ManagedOAuthSetup).exists()).toBe(false);
			expect(wrapper.findComponent(TenantOAuthSetup).exists()).toBe(false);
		});
	});

	describe('telemetry on mount', () => {
		it('fires credential_setup_recipe_rendered telemetry with surface: modal on mount', async () => {
			mountComponent('managedOAuth');
			await flushPromises();
			expect(mockTrackRecipeEvent).toHaveBeenCalledWith(
				'credential_setup_recipe_rendered',
				'testApi',
				{ surface: 'modal' },
			);
		});
	});
});

// ---------------------------------------------------------------------------
// Tests: TenantOAuthSetup lifecycle
// ---------------------------------------------------------------------------

const mockCreateNewCredential = vi.fn();
const mockDeleteCredential = vi.fn();
const mockUpsertCredential = vi.fn();
const mockAuthorize = vi.fn();

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		authorize: mockAuthorize,
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		createNewCredential: mockCreateNewCredential,
		deleteCredential: mockDeleteCredential,
		upsertCredential: mockUpsertCredential,
		getCredentialTypeByName: mockGetCredentialTypeByName,
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProject: null,
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		workflowId: 'wf-1',
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: vi.fn(),
	}),
}));

import { mount } from '@vue/test-utils';
import TenantOAuthSetupComponent from './TenantOAuthSetup.vue';

// Stubs for N8n design-system components used by TenantOAuthSetup
const N8nInputStub = {
	name: 'N8nInput',
	props: ['modelValue', 'disabled'],
	emits: ['update:modelValue'],
	template:
		'<input v-bind="$attrs" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

const N8nButtonStub = {
	name: 'N8nButton',
	props: ['label', 'disabled', 'loading'],
	emits: ['click'],
	template:
		'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};

const N8nTextStub = {
	name: 'N8nText',
	template: '<span v-bind="$attrs"><slot /></span>',
};

const N8nInputLabelStub = {
	name: 'N8nInputLabel',
	props: ['label'],
	template: '<label v-bind="$attrs"><slot /></label>',
};

function mountTenantOAuth() {
	return mount(TenantOAuthSetupComponent, {
		props: {
			credentialTypeName: 'testApi',
			credentialDisplayName: 'Test API',
			bootstrapField: 'subdomain',
			bootstrapFieldLabel: 'Subdomain',
		},
		global: {
			plugins: [i18nInstance],
			stubs: {
				N8nInput: N8nInputStub,
				N8nButton: N8nButtonStub,
				N8nText: N8nTextStub,
				N8nInputLabel: N8nInputLabelStub,
			},
		},
		attachTo: document.body,
	});
}

const MOCK_CREDENTIAL = {
	id: 'cred-123',
	name: 'Test API',
	type: 'testApi',
	data: {},
	createdAt: '',
	updatedAt: '',
	isManaged: false,
	scopes: [],
};

describe('TenantOAuthSetup', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({ createSpy: vi.fn });
		setActivePinia(pinia);
		vi.clearAllMocks();
	});

	describe('Connect click', () => {
		it('creates credential with skipStoreUpdate: true and bootstrap field in data', async () => {
			mockCreateNewCredential.mockResolvedValue(MOCK_CREDENTIAL);
			mockAuthorize.mockResolvedValue(true);

			const wrapper = mountTenantOAuth();

			// Set a bootstrap value so the button is enabled
			const input = wrapper.find('[data-test-id="tenant-oauth-bootstrap-field"]');
			await input.setValue('my-subdomain');

			// Click connect
			const button = wrapper.find('[data-test-id="tenant-oauth-connect-button"]');
			await button.trigger('click');
			await flushPromises();

			expect(mockCreateNewCredential).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						subdomain: 'my-subdomain',
					}),
				}),
				undefined,
				undefined,
				{ skipStoreUpdate: true },
			);
		});

		it('calls authorize with the created credential', async () => {
			mockCreateNewCredential.mockResolvedValue(MOCK_CREDENTIAL);
			mockAuthorize.mockResolvedValue(true);

			const wrapper = mountTenantOAuth();

			const input = wrapper.find('[data-test-id="tenant-oauth-bootstrap-field"]');
			await input.setValue('my-subdomain');

			const button = wrapper.find('[data-test-id="tenant-oauth-connect-button"]');
			await button.trigger('click');
			await flushPromises();

			expect(mockAuthorize).toHaveBeenCalledWith(MOCK_CREDENTIAL, expect.any(AbortSignal));
		});
	});

	describe('Authorize success', () => {
		it('calls upsertCredential and emits success on authorize success', async () => {
			mockCreateNewCredential.mockResolvedValue(MOCK_CREDENTIAL);
			mockAuthorize.mockResolvedValue(true);

			const wrapper = mountTenantOAuth();

			const input = wrapper.find('[data-test-id="tenant-oauth-bootstrap-field"]');
			await input.setValue('my-subdomain');

			const button = wrapper.find('[data-test-id="tenant-oauth-connect-button"]');
			await button.trigger('click');
			await flushPromises();

			expect(mockUpsertCredential).toHaveBeenCalledWith(MOCK_CREDENTIAL);
			expect(wrapper.emitted('success')).toBeDefined();
			expect(wrapper.emitted('success')![0]).toEqual([MOCK_CREDENTIAL]);
		});
	});

	describe('Authorize failure', () => {
		it('calls deleteCredential and emits failure on authorize failure', async () => {
			mockCreateNewCredential.mockResolvedValue(MOCK_CREDENTIAL);
			mockAuthorize.mockResolvedValue(false);
			mockDeleteCredential.mockResolvedValue(undefined);

			const wrapper = mountTenantOAuth();

			const input = wrapper.find('[data-test-id="tenant-oauth-bootstrap-field"]');
			await input.setValue('my-subdomain');

			const button = wrapper.find('[data-test-id="tenant-oauth-connect-button"]');
			await button.trigger('click');
			await flushPromises();

			expect(mockDeleteCredential).toHaveBeenCalledWith({ id: MOCK_CREDENTIAL.id });
			expect(mockUpsertCredential).not.toHaveBeenCalled();
			expect(wrapper.emitted('failure')).toBeDefined();
		});
	});

	describe('Unmount cleanup', () => {
		it('aborts controller and deletes credential when unmounted during pending authorize', async () => {
			mockCreateNewCredential.mockResolvedValue(MOCK_CREDENTIAL);
			mockDeleteCredential.mockResolvedValue(undefined);

			// authorize never resolves during this test
			let resolveAuthorize: (value: boolean) => void;
			mockAuthorize.mockImplementation(
				async () => await new Promise<boolean>((resolve) => (resolveAuthorize = resolve)),
			);

			const wrapper = mountTenantOAuth();

			const input = wrapper.find('[data-test-id="tenant-oauth-bootstrap-field"]');
			await input.setValue('my-subdomain');

			const button = wrapper.find('[data-test-id="tenant-oauth-connect-button"]');
			await button.trigger('click');

			// Give the component time to create the credential and set up the abort controller
			await flushPromises();

			// Unmount while authorize is pending
			wrapper.unmount();
			await flushPromises();

			expect(mockDeleteCredential).toHaveBeenCalledWith({ id: MOCK_CREDENTIAL.id });

			// Verify the signal was aborted (authorize was called with an AbortSignal)
			const authorizeCall = mockAuthorize.mock.calls[0];
			const signal = authorizeCall[1] as AbortSignal;
			expect(signal.aborted).toBe(true);

			// Clean up the hanging promise
			resolveAuthorize!(false);
		});

		it('does not double-delete when unmount aborts and failure handler runs', async () => {
			mockCreateNewCredential.mockResolvedValue(MOCK_CREDENTIAL);
			mockDeleteCredential.mockResolvedValue(undefined);

			let resolveAuthorize: (value: boolean) => void;
			mockAuthorize.mockImplementation(
				async () => await new Promise<boolean>((resolve) => (resolveAuthorize = resolve)),
			);

			const wrapper = mountTenantOAuth();

			const input = wrapper.find('[data-test-id="tenant-oauth-bootstrap-field"]');
			await input.setValue('my-subdomain');

			const button = wrapper.find('[data-test-id="tenant-oauth-connect-button"]');
			await button.trigger('click');

			// Wait for credential creation to complete
			await flushPromises();

			// Unmount: this aborts and deletes
			wrapper.unmount();
			await flushPromises();

			// Clear the mock call count before the authorize resolves
			const deleteCallCountAfterUnmount = mockDeleteCredential.mock.calls.length;

			// Now resolve the authorize promise with false (simulating failure after abort)
			resolveAuthorize!(false);
			await flushPromises();

			// delete should NOT have been called again (aborted signal guards against it)
			expect(mockDeleteCredential.mock.calls.length).toBe(deleteCallCountAfterUnmount);
		});
	});
});
