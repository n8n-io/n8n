import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useCredentialResolvers } from './useCredentialResolvers';
import { useUIStore } from '@/app/stores/ui.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { mockedStore } from '@/__tests__/utils';
import {
	CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
	CREDENTIAL_RESOLVER_DELETE_MODAL_KEY,
} from '@/app/constants';
import * as restApiClient from '@n8n/rest-api-client';
import type { CredentialResolver, CredentialResolverType } from '@n8n/api-types';

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();

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

	describe('openDeleteModal', () => {
		it('should open delete modal with resolver and default callback', () => {
			const uiStore = useUIStore();

			const { openDeleteModal } = useCredentialResolvers();

			openDeleteModal(mockResolvers[0]);

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_RESOLVER_DELETE_MODAL_KEY,
				data: {
					resolver: mockResolvers[0],
					onConfirm: expect.any(Function),
				},
			});
		});

		it('should open delete modal with custom onConfirm callback', () => {
			const uiStore = useUIStore();
			const customOnConfirm = vi.fn();

			const { openDeleteModal } = useCredentialResolvers();

			openDeleteModal(mockResolvers[0], customOnConfirm);

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_RESOLVER_DELETE_MODAL_KEY,
				data: {
					resolver: mockResolvers[0],
					onConfirm: customOnConfirm,
				},
			});
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
