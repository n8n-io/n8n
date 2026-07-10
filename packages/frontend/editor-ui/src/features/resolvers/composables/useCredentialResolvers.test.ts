import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isVNode } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useCredentialResolvers } from './useCredentialResolvers';
import { useUIStore } from '@/app/stores/ui.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { mockedStore } from '@/__tests__/utils';
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
		getCredentialResolverWorkflows: vi.fn(),
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
];

const mockResolverTypes: CredentialResolverType[] = [
	{
		name: 'test-type',
		displayName: 'Test Type Display Name',
		description: 'A test resolver type',
	},
];

describe('useCredentialResolvers', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());

		const rootStore = mockedStore(useRootStore);
		rootStore.restApiContext = {
			baseUrl: 'http://localhost',
			pushRef: 'test-ref',
		};

		vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue([]);
		vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue([]);
		vi.mocked(restApiClient.getCredentialResolverWorkflows).mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchResolvers', () => {
		it('should fetch resolvers and update state', async () => {
			vi.mocked(restApiClient.getCredentialResolvers).mockResolvedValue(mockResolvers);

			const { resolvers, isLoading, fetchResolvers } = useCredentialResolvers();

			expect(resolvers.value).toEqual([]);
			expect(isLoading.value).toBe(false);

			const fetchPromise = fetchResolvers();
			expect(isLoading.value).toBe(true);

			await fetchPromise;

			expect(resolvers.value).toEqual(mockResolvers);
			expect(isLoading.value).toBe(false);
		});

		it('should show error toast when fetch fails', async () => {
			const error = new Error('Fetch failed');
			vi.mocked(restApiClient.getCredentialResolvers).mockRejectedValue(error);

			const { fetchResolvers } = useCredentialResolvers();

			await fetchResolvers();

			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String));
		});
	});

	describe('fetchResolverTypes', () => {
		it('should fetch resolver types and update state', async () => {
			vi.mocked(restApiClient.getCredentialResolverTypes).mockResolvedValue(mockResolverTypes);

			const { resolverTypes, fetchResolverTypes } = useCredentialResolvers();

			expect(resolverTypes.value).toEqual([]);

			await fetchResolverTypes();

			expect(resolverTypes.value).toEqual(mockResolverTypes);
		});

		it('should show error toast when fetch fails', async () => {
			const error = new Error('Fetch types failed');
			vi.mocked(restApiClient.getCredentialResolverTypes).mockRejectedValue(error);

			const { fetchResolverTypes } = useCredentialResolvers();

			await fetchResolverTypes();

			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String));
		});
	});

	describe('deleteResolver', () => {
		it('should show confirmation dialog before deleting', async () => {
			mockConfirm.mockResolvedValue(MODAL_CANCEL);

			const { deleteResolver } = useCredentialResolvers();

			await deleteResolver(mockResolvers[0]);

			expect(mockConfirm).toHaveBeenCalled();
			expect(restApiClient.deleteCredentialResolver).not.toHaveBeenCalled();
		});

		it('should delete resolver when confirmed', async () => {
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			vi.mocked(restApiClient.deleteCredentialResolver).mockResolvedValue(undefined);

			const { deleteResolver, isDeleting } = useCredentialResolvers();

			const result = await deleteResolver(mockResolvers[0]);

			expect(result).toBe(true);
			expect(restApiClient.deleteCredentialResolver).toHaveBeenCalledWith(
				expect.any(Object),
				'resolver-1',
			);
			expect(mockShowMessage).toHaveBeenCalledWith({
				title: expect.any(String),
				type: 'success',
			});
			expect(isDeleting.value).toBe(false);
		});

		it('should return false when delete is cancelled', async () => {
			mockConfirm.mockResolvedValue(MODAL_CANCEL);

			const { deleteResolver } = useCredentialResolvers();

			const result = await deleteResolver(mockResolvers[0]);

			expect(result).toBe(false);
		});

		it('should show error toast when delete fails', async () => {
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			const error = new Error('Delete failed');
			vi.mocked(restApiClient.deleteCredentialResolver).mockRejectedValue(error);

			const { deleteResolver } = useCredentialResolvers();

			const result = await deleteResolver(mockResolvers[0]);

			expect(result).toBe(false);
			expect(mockShowError).toHaveBeenCalledWith(error, expect.any(String));
		});

		it('should fetch affected workflows before showing confirm dialog', async () => {
			mockConfirm.mockResolvedValue(MODAL_CANCEL);

			const { deleteResolver } = useCredentialResolvers();

			await deleteResolver(mockResolvers[0]);

			expect(restApiClient.getCredentialResolverWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				'resolver-1',
			);
		});

		it('should pass affected workflows as VNode to confirm message', async () => {
			const workflows = [
				{ id: 'wf-1', name: 'My Workflow' },
				{ id: 'wf-2', name: 'Other Workflow' },
			];
			vi.mocked(restApiClient.getCredentialResolverWorkflows).mockResolvedValue(workflows);
			mockConfirm.mockResolvedValue(MODAL_CANCEL);

			const { deleteResolver } = useCredentialResolvers();

			await deleteResolver(mockResolvers[0]);

			const confirmMessage = mockConfirm.mock.calls[0][0];
			expect(isVNode(confirmMessage)).toBe(true);
			expect(confirmMessage.props).toEqual(
				expect.objectContaining({
					resolverName: 'Test Resolver',
					affectedWorkflows: workflows,
				}),
			);
		});

		it('should fall back to VNode with empty workflows when affected workflows fetch fails', async () => {
			vi.mocked(restApiClient.getCredentialResolverWorkflows).mockRejectedValue(
				new Error('Network error'),
			);
			mockConfirm.mockResolvedValue(MODAL_CANCEL);

			const { deleteResolver } = useCredentialResolvers();

			await deleteResolver(mockResolvers[0]);

			expect(mockConfirm).toHaveBeenCalled();
			const confirmMessage = mockConfirm.mock.calls[0][0];
			expect(isVNode(confirmMessage)).toBe(true);
			expect(confirmMessage.props).toEqual(
				expect.objectContaining({
					resolverName: 'Test Resolver',
					affectedWorkflows: [],
				}),
			);
		});

		it('should pass all affected workflows to VNode including overflow', async () => {
			const manyWorkflows = Array.from({ length: 8 }, (_, i) => ({
				id: `wf-${i}`,
				name: `Workflow ${i}`,
			}));
			vi.mocked(restApiClient.getCredentialResolverWorkflows).mockResolvedValue(manyWorkflows);
			mockConfirm.mockResolvedValue(MODAL_CANCEL);

			const { deleteResolver } = useCredentialResolvers();

			await deleteResolver(mockResolvers[0]);

			const confirmMessage = mockConfirm.mock.calls[0][0];
			expect(isVNode(confirmMessage)).toBe(true);
			// Component receives all workflows; truncation is handled in the template
			expect(confirmMessage.props?.affectedWorkflows).toHaveLength(8);
		});
	});

	describe('openCreateModal', () => {
		it('should open modal with default callback', () => {
			const uiStore = useUIStore();

			const { openCreateModal } = useCredentialResolvers();

			openCreateModal();

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
				data: {
					onSave: expect.any(Function),
				},
			});
		});

		it('should open modal with custom callback', () => {
			const uiStore = useUIStore();
			const customOnSave = vi.fn();

			const { openCreateModal } = useCredentialResolvers();

			openCreateModal({ onSave: customOnSave });

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
				data: {
					onSave: customOnSave,
				},
			});
		});
	});

	describe('openEditModal', () => {
		it('should open modal with resolver id and default callbacks', () => {
			const uiStore = useUIStore();

			const { openEditModal } = useCredentialResolvers();

			openEditModal('resolver-1');

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
				data: {
					resolverId: 'resolver-1',
					onSave: expect.any(Function),
					onDelete: expect.any(Function),
				},
			});
		});

		it('should open modal with custom callbacks', () => {
			const uiStore = useUIStore();
			const customOnSave = vi.fn();
			const customOnDelete = vi.fn();

			const { openEditModal } = useCredentialResolvers();

			openEditModal('resolver-1', { onSave: customOnSave, onDelete: customOnDelete });

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
				data: {
					resolverId: 'resolver-1',
					onSave: customOnSave,
					onDelete: customOnDelete,
				},
			});
		});
	});
});
