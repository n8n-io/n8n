import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import DeleteSecretsProviderModal from './DeleteSecretsProviderModal.ee.vue';
import { DELETE_SECRETS_PROVIDER_MODAL_KEY } from '@/app/constants';
import { vi } from 'vitest';
import * as credentialsApi from '@/features/credentials/credentials.api';
import * as secretsProviderApi from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import userEvent from '@testing-library/user-event';

vi.mock('@/features/credentials/credentials.api');
vi.mock('@n8n/rest-api-client', async () => {
	const actual = await vi.importActual('@n8n/rest-api-client');
	return {
		...actual,
		deleteSecretProviderConnection: vi.fn(),
	};
});

const mockCredentials = [
	{
		id: '1',
		name: 'cred1',
		type: 'test',
		createdAt: '2021-05-05T00:00:00Z',
		updatedAt: '2021-05-05T00:00:00Z',
		isManaged: false,
	},
];

const renderComponent = createComponentRenderer(DeleteSecretsProviderModal, {
	global: {
		stubs: {
			Modal: {
				template: `
					<div>
						<slot name="content" />
						<slot name="footer" />
					</div>
				`,
			},
		},
	},
});

describe('DeleteSecretsProviderModal', () => {
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		pinia = createTestingPinia();
		vi.clearAllMocks();
		vi.mocked(credentialsApi.getAllCredentials).mockResolvedValue(mockCredentials);
	});

	it('should render modal with correct content', async () => {
		const { findByTestId, getByText } = renderComponent({
			pinia,
			props: {
				modalName: DELETE_SECRETS_PROVIDER_MODAL_KEY,
				data: {
					providerKey: 'aws-prod',
					providerName: 'aws-prod',
					secretsCount: 5,
				},
			},
		});

		// Wait for confirmation input to appear (indicates credentials are loaded)
		await findByTestId('delete-confirmation-input');

		expect(getByText(/aws-prod/)).toBeInTheDocument();
	});

	it('should disable delete button when confirmation text does not match', async () => {
		const { getByTestId, findByTestId } = renderComponent({
			pinia,
			props: {
				modalName: DELETE_SECRETS_PROVIDER_MODAL_KEY,
				data: {
					providerKey: 'aws-prod',
					providerName: 'aws-prod',
					secretsCount: 5,
				},
			},
		});

		// Wait for confirmation input to appear (indicates credentials are loaded)
		await findByTestId('delete-confirmation-input');

		const deleteButton = getByTestId('confirm-delete-button');
		expect(deleteButton).toBeDisabled();
	});

	it('should enable delete button when confirmation text matches provider name', async () => {
		const { getByTestId, findByTestId } = renderComponent({
			pinia,
			props: {
				modalName: DELETE_SECRETS_PROVIDER_MODAL_KEY,
				data: {
					providerKey: 'aws-prod',
					providerName: 'aws-prod',
					secretsCount: 5,
				},
			},
		});

		// Wait for confirmation input to appear (indicates credentials are loaded)
		const input = await findByTestId('delete-confirmation-input');
		const deleteButton = getByTestId('confirm-delete-button');

		await userEvent.type(input, 'aws-prod');

		expect(deleteButton).not.toBeDisabled();
	});

	it('should call deleteSecretProviderConnection and onConfirm on delete', async () => {
		const onConfirm = vi.fn();
		const rootStore = useRootStore();
		vi.mocked(secretsProviderApi.deleteSecretProviderConnection).mockResolvedValue();

		const { getByTestId, findByTestId } = renderComponent({
			pinia,
			props: {
				modalName: DELETE_SECRETS_PROVIDER_MODAL_KEY,
				data: {
					providerKey: 'aws-prod',
					providerName: 'aws-prod',
					secretsCount: 5,
					onConfirm,
				},
			},
		});

		// Wait for confirmation input to appear (indicates credentials are loaded)
		const input = await findByTestId('delete-confirmation-input');
		await userEvent.type(input, 'aws-prod');

		const deleteButton = getByTestId('confirm-delete-button');
		await userEvent.click(deleteButton);

		expect(secretsProviderApi.deleteSecretProviderConnection).toHaveBeenCalledWith(
			rootStore.restApiContext,
			'aws-prod',
		);
		expect(onConfirm).toHaveBeenCalled();
	});

	it('should fetch credentials count on mount', () => {
		renderComponent({
			pinia,
			props: {
				modalName: DELETE_SECRETS_PROVIDER_MODAL_KEY,
				data: {
					providerKey: 'aws-prod',
					providerName: 'aws-prod',
					secretsCount: 5,
				},
			},
		});

		expect(credentialsApi.getAllCredentials).toHaveBeenCalledWith(expect.anything(), {
			includeGlobal: true,
			externalSecretsStore: 'aws-prod',
		});
	});
});
