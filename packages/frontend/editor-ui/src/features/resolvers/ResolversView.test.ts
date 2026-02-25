import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import ResolversView from './ResolversView.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { CREDENTIAL_RESOLVER_EDIT_MODAL_KEY, MODAL_CONFIRM, MODAL_CANCEL } from '@/app/constants';
import * as restApiClient from '@n8n/rest-api-client';
import type { CredentialResolver, CredentialResolverType } from '@n8n/api-types';

const mockConfirm = vi.fn();
const mockShowError = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: mockConfirm,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: mockShowError,
		showMessage: mockShowMessage,
	}),
}));

vi.mock('@n8n/rest-api-client', async (importOriginal) => {
	const actual = await importOriginal<typeof restApiClient>();
	return {
		...actual,
		getCredentialResolvers: vi.fn(),
		getCredentialResolverTypes: vi.fn(),
		deleteCredentialResolver: vi.fn(),
	};
});

const mockResolvers: CredentialResolver[] = [
	{
		id: 'resolver-1',
		name: 'Test Resolver',
		type: 'test-type',
		config: '{}',
		createdAt: new Date('2024-01-15'),
		updatedAt: new Date('2024-06-20'),
	},
	{
		id: 'resolver-2',
		name: 'Another Resolver',
		type: 'another-type',
		config: '{}',
		createdAt: new Date('2024-03-10'),
		updatedAt: new Date('2024-07-15'),
	},
];

const mockResolverTypes: CredentialResolverType[] = [
	{
		name: 'test-type',
		displayName: 'Test Type Display Name',
		description: 'A test resolver type',
	},
	{
		name: 'another-type',
		displayName: 'Another Type Display',
		description: 'Another resolver type',
	},
];

const renderComponent = createComponentRenderer(ResolversView);

describe('ResolversView', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let uiStore: MockedStore<typeof useUIStore>;
	let rootStore: MockedStore<typeof useRootStore>;

	beforeEach(() => {
		pinia = createTestingPinia();
		uiStore = mockedStore(useUIStore);
		rootStore = mockedStore(useRootStore);

		rootStore.restApiContext = {
			baseUrl: 'http://localhost',
			pushRef: 'test-ref',
		};

		vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue([]);
		vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue(mockResolverTypes);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Loading state', () => {
		it('should show loading skeleton when data is being fetched', async () => {
			// Create a promise that never resolves to simulate loading state
			vi.mocked(restApiClient.getCredentialResolvers).mockImplementation(
				async () => await new Promise(() => {}),
			);

			const { container } = renderComponent({ pinia });

			// The loading component should be visible
			await waitFor(() => {
				expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
			});
		});
	});

	describe('Empty state', () => {
		it('should display empty state when no resolvers exist', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue([]);

			const { getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText('Resolve dynamic credentials from user identity')).toBeInTheDocument();
			});
		});

		it('should open create modal when clicking "Add new" button in empty state', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue([]);

			const { getByText } = renderComponent({ pinia });

			// Wait for empty state to be displayed (after loading completes)
			await waitFor(() => {
				expect(getByText('Resolve dynamic credentials from user identity')).toBeInTheDocument();
			});

			// Now the Add Resolver button should be available
			await waitFor(() => {
				expect(getByText('Add Resolver')).toBeInTheDocument();
			});

			const addButton = getByText('Add Resolver');
			await userEvent.click(addButton);

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
				data: {
					onSave: expect.any(Function),
				},
			});
		});
	});

	describe('List view', () => {
		it('should display resolver cards when resolvers exist', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue(mockResolvers);

			const { getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText('Test Resolver')).toBeInTheDocument();
				expect(getByText('Another Resolver')).toBeInTheDocument();
			});
		});

		it('should display resolver type display name from types list', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue(mockResolvers);
			vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue(mockResolverTypes);

			const { getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText(/Test Type Display Name/)).toBeInTheDocument();
			});
		});

		it('should display add button in list view header', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue(mockResolvers);

			const { getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText('Add Resolver')).toBeInTheDocument();
			});
		});

		it('should open create modal when clicking add button in list view', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue(mockResolvers);

			const { getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText('Test Resolver')).toBeInTheDocument();
			});

			const addButton = getByText('Add Resolver');
			await userEvent.click(addButton);

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
				data: {
					onSave: expect.any(Function),
				},
			});
		});
	});

	describe('Actions', () => {
		it('should open edit modal when clicking on a resolver card', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue(mockResolvers);

			const { getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText('Test Resolver')).toBeInTheDocument();
			});

			await userEvent.click(getByText('Test Resolver'));

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
				data: {
					resolverId: 'resolver-1',
					onSave: expect.any(Function),
					onDelete: expect.any(Function),
				},
			});
		});

		it('should show confirmation dialog when deleting a resolver', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue([mockResolvers[0]]);
			mockConfirm.mockResolvedValue(MODAL_CANCEL);

			const { container, getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText('Test Resolver')).toBeInTheDocument();
			});

			// Find and click the action toggle button
			const actionToggle = container.querySelector('[data-test-id="action-toggle"]');
			expect(actionToggle).toBeInTheDocument();
			await userEvent.click(actionToggle!);

			// Wait for dropdown to appear and click delete
			await waitFor(() => {
				const deleteOption = getByText('Delete');
				expect(deleteOption).toBeInTheDocument();
			});
			await userEvent.click(getByText('Delete'));

			expect(mockConfirm).toHaveBeenCalled();
		});

		it('should delete resolver when confirmed', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue([mockResolvers[0]]);
			vi.mocked(restApiClient.deleteCredentialResolver).mockResolvedValue(undefined);
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);

			const { container, getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText('Test Resolver')).toBeInTheDocument();
			});

			// Find and click the action toggle button
			const actionToggle = container.querySelector('[data-test-id="action-toggle"]');
			await userEvent.click(actionToggle!);

			await waitFor(() => {
				expect(getByText('Delete')).toBeInTheDocument();
			});
			await userEvent.click(getByText('Delete'));

			await waitFor(() => {
				expect(restApiClient.deleteCredentialResolver).toHaveBeenCalledWith(
					rootStore.restApiContext,
					'resolver-1',
				);
			});

			expect(mockShowMessage).toHaveBeenCalledWith({
				title: expect.any(String),
				type: 'success',
			});
		});

		it('should not delete resolver when cancelled', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue([mockResolvers[0]]);
			mockConfirm.mockResolvedValue(MODAL_CANCEL);

			const { container, getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText('Test Resolver')).toBeInTheDocument();
			});

			// Find and click the action toggle button
			const actionToggle = container.querySelector('[data-test-id="action-toggle"]');
			await userEvent.click(actionToggle!);

			await waitFor(() => {
				expect(getByText('Delete')).toBeInTheDocument();
			});
			await userEvent.click(getByText('Delete'));

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalled();
			});

			expect(restApiClient.deleteCredentialResolver).not.toHaveBeenCalled();
		});
	});

	describe('Error handling', () => {
		it('should show error toast when delete fails', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue([mockResolvers[0]]);
			const error = new Error('Delete failed');
			vi.mocked(restApiClient.deleteCredentialResolver).mockRejectedValue(error);
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);

			const { container, getByText } = renderComponent({ pinia });

			await waitFor(() => {
				expect(getByText('Test Resolver')).toBeInTheDocument();
			});

			// Find and click the action toggle button
			const actionToggle = container.querySelector('[data-test-id="action-toggle"]');
			await userEvent.click(actionToggle!);

			await waitFor(() => {
				expect(getByText('Delete')).toBeInTheDocument();
			});
			await userEvent.click(getByText('Delete'));

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String));
			});
		});
	});
});
