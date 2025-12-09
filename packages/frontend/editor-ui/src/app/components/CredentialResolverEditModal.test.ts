import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import CredentialResolverEditModal from '@/app/components/CredentialResolverEditModal.vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { CREDENTIAL_RESOLVER_EDIT_MODAL_KEY } from '../constants';
import * as restApiClient from '@n8n/rest-api-client';
import type { CredentialResolverType } from '@n8n/api-types';

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
