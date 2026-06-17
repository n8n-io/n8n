import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import CredentialResolverEditModal from '@/app/components/CredentialResolverEditModal.vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { CREDENTIAL_RESOLVER_EDIT_MODAL_KEY } from '../constants';
import * as restApiClient from '@n8n/rest-api-client';
import type { CredentialResolverType } from '@n8n/api-types';
import { defineComponent, h, watch, toRefs } from 'vue';

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	return {
		useToast: () => ({
			showError,
		}),
	};
});

vi.mock('@n8n/rest-api-client', async (importOriginal) => {
	const actual = await importOriginal<typeof restApiClient>();
	return {
		...actual,
		getCredentialResolverTypes: vi.fn(),
		getCredentialResolver: vi.fn(),
		createCredentialResolver: vi.fn(),
		updateCredentialResolver: vi.fn(),
	};
});

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="content" />
		</div>
	`,
};

const CredentialInputsStub = {
	template: '<div data-test-id="credential-inputs" />',
};

const global = {
	stubs: {
		Modal: ModalStub,
		CredentialInputs: CredentialInputsStub,
	},
};

const mockResolverTypes: CredentialResolverType[] = [
	{
		name: 'test-resolver',
		displayName: 'Test Resolver',
		description: 'A test resolver',
		options: [
			{
				name: 'apiKey',
				type: 'string',
				displayName: 'API Key',
				required: true,
				description: 'Enter your API key',
				placeholder: 'Enter key',
			},
		],
	},
];

const mockOAuthResolverTypes: CredentialResolverType[] = [
	{
		name: 'credential-resolver.oauth2-1.0',
		displayName: 'OAuth2 Resolver',
		description: 'OAuth2 based credential resolver',
		options: [
			{
				displayName: 'Metadata URL',
				name: 'metadataUri',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Validation Method',
				name: 'validation',
				type: 'options',
				options: [
					{ name: 'OAuth2 Token Introspection', value: 'oauth2-introspection' },
					{ name: 'OAuth2 UserInfo Endpoint', value: 'oauth2-userinfo' },
				],
				default: 'oauth2-introspection',
			},
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string',
				default: '',
				displayOptions: {
					hide: { validation: ['oauth2-userinfo'] },
					show: { validation: ['oauth2-introspection'] },
				},
			},
			{
				displayName: 'Client Secret',
				name: 'clientSecret',
				type: 'string',
				default: '',
				displayOptions: {
					hide: { validation: ['oauth2-userinfo'] },
					show: { validation: ['oauth2-introspection'] },
				},
			},
			{
				displayName: 'Subject Claim',
				name: 'subjectClaim',
				type: 'string',
				default: 'sub',
			},
		],
	},
];

/**
 * Creates a spy component that replaces CredentialInputs, capturing props on
 * every render and optionally exposing an `emit('update', ...)` trigger.
 */
function createCredentialInputsSpy({ withEmit = false } = {}) {
	const capturedProps: Array<Record<string, unknown>> = [];
	let triggerUpdate: ((data: { name: string; value: unknown }) => void) | undefined;

	const component = defineComponent({
		props: ['credentialProperties', 'credentialData', 'documentationUrl', 'showValidationWarnings'],
		emits: ['update'],
		setup(props, { emit }) {
			if (withEmit) {
				triggerUpdate = (data) => emit('update', data);
			}
			// Capture initial props
			capturedProps.push({ ...props });
			// Re-capture on every prop change
			const refs = toRefs(props);
			watch(
				() => Object.values(refs).map((r) => r.value),
				() => capturedProps.push({ ...props }),
			);
			return () => h('div', { 'data-test-id': 'credential-inputs' });
		},
	});

	return { capturedProps, component, getTriggerUpdate: () => triggerUpdate };
}

function getPropertyNames(capturedProps: Array<Record<string, unknown>>) {
	const lastProps = capturedProps[capturedProps.length - 1];
	return (lastProps.credentialProperties as Array<{ name: string }>).map((p) => p.name);
}

const renderModal = createComponentRenderer(CredentialResolverEditModal);

let pinia: ReturnType<typeof createTestingPinia>;

describe('CredentialResolverEditModal', () => {
	let rootStore: MockedStore<typeof useRootStore>;
	let toast: ReturnType<typeof useToast>;

	beforeEach(() => {
		pinia = createTestingPinia();

		rootStore = mockedStore(useRootStore);
		toast = useToast();

		rootStore.restApiContext = {
			baseUrl: 'http://localhost',
			pushRef: 'test-ref',
		};

		vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue(mockResolverTypes);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Component rendering', () => {
		it('should load resolver types on mount', async () => {
			renderModal({
				props: {
					modalName: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
				},
				pinia,
				global,
			});

			await vi.waitFor(() => {
				expect(restApiClient.getCredentialResolverTypes).toHaveBeenCalledWith(
					rootStore.restApiContext,
				);
			});
		});
	});

	describe('Create resolver', () => {
		it('should render in create mode without resolverId', async () => {
			const onSave = vi.fn();

			renderModal({
				props: {
					modalName: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
					data: {
						onSave,
					},
				},
				pinia,
				global,
			});

			// Wait for types to load
			await vi.waitFor(() => {
				expect(restApiClient.getCredentialResolverTypes).toHaveBeenCalled();
			});

			// Verify it doesn't try to load an existing resolver
			expect(restApiClient.getCredentialResolver).not.toHaveBeenCalled();
		});
	});

	describe('Edit resolver', () => {
		it('should load existing resolver when resolverId is provided', async () => {
			const mockResolver = {
				id: 'existing-resolver-id',
				name: 'Existing Resolver',
				type: 'test-resolver',
				config: '{}',
				decryptedConfig: { apiKey: 'secret-key' },
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			vi.mocked(restApiClient.getCredentialResolver).mockResolvedValue(mockResolver);

			renderModal({
				props: {
					modalName: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
					data: {
						resolverId: 'existing-resolver-id',
					},
				},
				pinia,
				global,
			});

			await vi.waitFor(() => {
				expect(restApiClient.getCredentialResolver).toHaveBeenCalledWith(
					rootStore.restApiContext,
					'existing-resolver-id',
				);
			});
		});
	});

	describe('displayOptions filtering', () => {
		it('should hide clientId and clientSecret when validation is oauth2-userinfo', async () => {
			const { capturedProps, component } = createCredentialInputsSpy();

			vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue(mockOAuthResolverTypes);

			vi.mocked(restApiClient.getCredentialResolver).mockResolvedValue({
				id: 'oauth-resolver-id',
				name: 'OAuth Resolver',
				type: 'credential-resolver.oauth2-1.0',
				config: '{}',
				decryptedConfig: {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					validation: 'oauth2-userinfo',
					subjectClaim: 'sub',
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			renderModal({
				props: {
					modalName: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
					data: { resolverId: 'oauth-resolver-id' },
				},
				pinia,
				global: { stubs: { Modal: ModalStub, CredentialInputs: component } },
			});

			await vi.waitFor(() => {
				expect(capturedProps.length).toBeGreaterThan(0);
			});

			const propertyNames = getPropertyNames(capturedProps);
			expect(propertyNames).toContain('metadataUri');
			expect(propertyNames).toContain('validation');
			expect(propertyNames).toContain('subjectClaim');
			expect(propertyNames).not.toContain('clientId');
			expect(propertyNames).not.toContain('clientSecret');
		});

		it('should show clientId and clientSecret when validation is oauth2-introspection', async () => {
			const { capturedProps, component } = createCredentialInputsSpy();

			vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue(mockOAuthResolverTypes);

			vi.mocked(restApiClient.getCredentialResolver).mockResolvedValue({
				id: 'oauth-resolver-id',
				name: 'OAuth Resolver',
				type: 'credential-resolver.oauth2-1.0',
				config: '{}',
				decryptedConfig: {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					validation: 'oauth2-introspection',
					clientId: 'my-client',
					clientSecret: 'my-secret',
					subjectClaim: 'sub',
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			renderModal({
				props: {
					modalName: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
					data: { resolverId: 'oauth-resolver-id' },
				},
				pinia,
				global: { stubs: { Modal: ModalStub, CredentialInputs: component } },
			});

			await vi.waitFor(() => {
				expect(capturedProps.length).toBeGreaterThan(0);
			});

			const propertyNames = getPropertyNames(capturedProps);
			expect(propertyNames).toContain('metadataUri');
			expect(propertyNames).toContain('validation');
			expect(propertyNames).toContain('clientId');
			expect(propertyNames).toContain('clientSecret');
			expect(propertyNames).toContain('subjectClaim');
		});

		it('should reactively hide fields when user switches validation to oauth2-userinfo', async () => {
			const { capturedProps, component, getTriggerUpdate } = createCredentialInputsSpy({
				withEmit: true,
			});

			vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue(mockOAuthResolverTypes);

			vi.mocked(restApiClient.getCredentialResolver).mockResolvedValue({
				id: 'oauth-resolver-id',
				name: 'OAuth Resolver',
				type: 'credential-resolver.oauth2-1.0',
				config: '{}',
				decryptedConfig: {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					validation: 'oauth2-introspection',
					clientId: 'my-client',
					clientSecret: 'my-secret',
					subjectClaim: 'sub',
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			renderModal({
				props: {
					modalName: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
					data: { resolverId: 'oauth-resolver-id' },
				},
				pinia,
				global: { stubs: { Modal: ModalStub, CredentialInputs: component } },
			});

			await vi.waitFor(() => {
				expect(capturedProps.length).toBeGreaterThan(0);
				expect(getTriggerUpdate()).toBeDefined();
			});

			expect(getPropertyNames(capturedProps)).toContain('clientId');
			expect(getPropertyNames(capturedProps)).toContain('clientSecret');

			// Simulate user switching validation method
			const propsCountBefore = capturedProps.length;
			getTriggerUpdate()!({ name: 'validation', value: 'oauth2-userinfo' });

			await vi.waitFor(() => {
				expect(capturedProps.length).toBeGreaterThan(propsCountBefore);
				expect(getPropertyNames(capturedProps)).not.toContain('clientId');
				expect(getPropertyNames(capturedProps)).not.toContain('clientSecret');
			});
		});
	});

	describe('Error handling', () => {
		it('should show error toast when loading resolver types fails', async () => {
			const error = new Error('Failed to load types');
			vi.mocked(restApiClient.getCredentialResolverTypes).mockRejectedValue(error);

			renderModal({
				props: {
					modalName: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
				},
				pinia,
				global,
			});

			await vi.waitFor(() => {
				expect(toast.showError).toHaveBeenCalledWith(error, expect.any(String));
			});
		});

		it('should show error toast when loading resolver fails', async () => {
			const error = new Error('Load failed');
			vi.mocked(restApiClient.getCredentialResolver).mockRejectedValue(error);

			renderModal({
				props: {
					modalName: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
					data: {
						resolverId: 'existing-resolver-id',
					},
				},
				pinia,
				global,
			});

			await vi.waitFor(() => {
				expect(toast.showError).toHaveBeenCalledWith(error, expect.any(String));
			});
		});
	});
});
