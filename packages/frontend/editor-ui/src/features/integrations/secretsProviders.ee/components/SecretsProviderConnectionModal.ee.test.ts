import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import SecretsProviderConnectionModal from './SecretsProviderConnectionModal.ee.vue';
import { SECRETS_PROVIDER_CONNECTION_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import { vi } from 'vitest';
import { nextTick } from 'vue';
import type { SecretProviderConnection } from '@n8n/api-types';

// Factory function for creating mock connection data
const createMockConnectionData = (overrides: Partial<SecretProviderConnection> = {}) => ({
	id: 'test-123',
	name: 'My Connection',
	type: 'awsSecretsManager',
	settings: { region: 'us-east-1' },
	state: 'connected',
	isEnabled: true,
	projects: [],
	secretsCount: 0,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

// Create the mock object that will be returned
const mockConnection = {
	connectionState: { value: 'initializing' },
	isLoading: { value: false },
	isTesting: { value: false },
	getConnection: vi.fn(),
	createConnection: vi.fn(),
	updateConnection: vi.fn(),
	testConnection: vi.fn(),
};

const mockConnectionModal = {
	canSave: { value: true },
	saveConnection: vi.fn(),
	connectionName: { value: '' },
	connectionNameBlurred: { value: false },
	selectedProviderType: { value: { displayName: 'AWS', type: 'aws' } },
	isEditMode: { value: false },
	hasUnsavedChanges: { value: false },
	isSaving: { value: false },
	connection: {
		isLoading: { value: false },
		connectionState: { value: 'initializing' },
	},
	providerTypeOptions: { value: [] },
	connectionSettings: { value: {} },
	expressionExample: { value: '' },
	connectionNameError: { value: '' },
	hyphenateConnectionName: vi.fn((name) => name),
	selectProviderType: vi.fn(),
	updateSettings: vi.fn(),
	loadConnection: vi.fn(),
	shouldDisplayProperty: vi.fn(() => true),
};

vi.mock('../composables/useSecretsProviderConnection.ee', () => ({
	useSecretsProviderConnection: vi.fn(() => mockConnection),
}));

vi.mock('../composables/useConnectionModal.ee', () => ({
	useConnectionModal: vi.fn((options) => {
		const isEditMode = !!options?.connectionId;
		return {
			...mockConnectionModal,
			isEditMode: { value: isEditMode },
			connectionName: { value: isEditMode ? 'My Connection' : '' },
		};
	}),
}));

// Stub the Modal component
const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

const initialState = {
	[STORES.UI]: {
		modalsById: {
			[SECRETS_PROVIDER_CONNECTION_MODAL_KEY]: {
				open: true,
			},
		},
		modalStack: [SECRETS_PROVIDER_CONNECTION_MODAL_KEY],
	},
};

const renderComponent = createComponentRenderer(SecretsProviderConnectionModal, {
	pinia: createTestingPinia({ initialState }),
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

describe('SecretsProviderConnectionModal', () => {
	const mockProviderTypes: SecretProviderTypeResponse[] = [
		{
			type: 'awsSecretsManager' as const,
			displayName: 'AWS Secrets Manager',
			icon: 'aws',
			properties: [],
		},
		{
			type: 'azureKeyVault' as const,
			displayName: 'Azure Key Vault',
			icon: 'azure',
			properties: [],
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		mockConnection.connectionState.value = 'initializing';
		mockConnection.isLoading.value = false;
		mockConnection.isTesting.value = false;
	});

	it('should load connection data', async () => {
		renderComponent({
			props: {
				modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
				data: {
					connectionId: 'test-123',
					providerTypes: mockProviderTypes,
				},
			},
		});

		await nextTick();

		expect(mockConnectionModal.loadConnection).toHaveBeenCalled();
	});

	describe('create mode', () => {
		it('should show provider type selector', () => {
			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerTypes: mockProviderTypes,
					},
				},
			});

			const providerTypeSelect = container.querySelector(
				'[data-test-id="provider-type-select"] input',
			);
			expect(providerTypeSelect).toBeInTheDocument();
			expect(providerTypeSelect).not.toHaveAttribute('disabled');
		});

		it('should show connection name input', () => {
			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerTypes: mockProviderTypes,
					},
				},
			});

			const nameInput = container.querySelector('[data-test-id="provider-name"]');
			expect(nameInput).toBeInTheDocument();
			expect(nameInput).not.toHaveAttribute('disabled');
		});

		it('should show save button', () => {
			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerTypes: mockProviderTypes,
					},
				},
			});

			const saveButton = container.querySelector(
				'[data-test-id="secrets-provider-connection-save-button"]',
			);

			expect(saveButton).toBeInTheDocument();
		});
	});

	describe('edit mode', () => {
		it('should render modal in edit mode', async () => {
			mockConnection.getConnection.mockResolvedValue(createMockConnectionData());

			const { container, getByDisplayValue } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						connectionId: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			expect(getByDisplayValue('My Connection')).toBeInTheDocument();
			const nameInput = container.querySelector('[data-test-id="provider-name"]');
			expect(nameInput).toHaveAttribute('disabled');
		});

		it('should show provider type selector in edit mode', async () => {
			mockConnection.getConnection.mockResolvedValue(createMockConnectionData());

			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						connectionId: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			const providerTypeSelect = container.querySelector(
				'[data-test-id="provider-type-select"] input',
			);
			expect(providerTypeSelect).toBeInTheDocument();
			expect(providerTypeSelect).toHaveAttribute('disabled');
		});
	});

	describe('save action', () => {
		it('should call saveConnection', async () => {
			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerTypes: mockProviderTypes,
					},
				},
			});

			const saveButton = container.querySelector(
				'[data-test-id="secrets-provider-connection-save-button"] button',
			) as HTMLElement;
			if (saveButton) {
				saveButton.click();
				await nextTick();
			}

			expect(mockConnectionModal.saveConnection).toHaveBeenCalled();
		});
	});

	describe('connection state display', () => {
		it('should show success message when connection is connected', async () => {
			mockConnectionModal.connection.connectionState.value = 'connected';

			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						connectionId: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			const successCallout = container.querySelector('[data-test-id="connection-success-callout"]');
			expect(successCallout).toBeInTheDocument();
		});

		it('should show error message when connection has error', async () => {
			mockConnectionModal.connection.connectionState.value = 'error';

			const { container } = renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						connectionId: 'test-123',
						providerTypes: mockProviderTypes,
					},
				},
			});

			await nextTick();

			const errorCallout = container.querySelector('[data-test-id="connection-error-callout"]');
			expect(errorCallout).toBeInTheDocument();
		});
	});

	describe('onClose callback', () => {
		it('should call onClose callback when modal is closed', async () => {
			const onCloseMock = vi.fn();

			renderComponent({
				props: {
					modalName: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
					data: {
						providerTypes: mockProviderTypes,
						onClose: onCloseMock,
					},
				},
			});

			expect(onCloseMock).toBeDefined();
		});
	});
});
