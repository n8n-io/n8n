import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import DataStoreActions from '@/features/dataStore/components/DataStoreActions.vue';
import { DATA_STORE_CARD_ACTIONS } from '@/features/dataStore/constants';
import { MODAL_CONFIRM } from '@/constants';
import type { DataStore } from '@/features/dataStore/datastore.types';

const mockMessage = {
	confirm: vi.fn(),
};

const mockToast = {
	showError: vi.fn(),
};

const mockDeleteDataStore = vi.fn();

vi.mock('@/composables/useMessage', () => ({
	useMessage: () => mockMessage,
}));

vi.mock('@/composables/useToast', () => ({
	useToast: () => mockToast,
}));

vi.mock('@/features/dataStore/dataStore.store', () => ({
	useDataStoreStore: () => ({
		deleteDataStore: mockDeleteDataStore,
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: { name?: string } }) => {
			if (key === 'generic.rename') return 'Rename';
			if (key === 'generic.delete') return 'Delete';
			if (key === 'generic.cancel') return 'Cancel';
			if (key === 'generic.unknownError') return 'Something went wrong';
			if (key === 'dataStore.delete.confirm.message')
				return `Are you sure that you want to delete "${options?.interpolate?.name}"?`;
			if (key === 'dataStore.delete.confirm.title') return 'Delete Data Store';
			if (key === 'dataStore.delete.error')
				return 'Something went wrong while deleting the data store.';
			return key;
		},
	}),
}));

const mockDataStore: DataStore = {
	id: '1',
	name: 'Test DataStore',
	sizeBytes: 1024,
	recordCount: 100,
	columns: [],
	createdAt: '2023-01-01T00:00:00.000Z',
	updatedAt: '2023-01-01T00:00:00.000Z',
	projectId: 'project-1',
};

const renderComponent = createComponentRenderer(DataStoreActions, {
	props: {
		dataStore: mockDataStore,
		isReadOnly: false,
	},
});

describe('DataStoreActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteDataStore.mockResolvedValue(true);
		mockMessage.confirm.mockResolvedValue(MODAL_CONFIRM);
	});

	it('should render N8nActionToggle with correct props', () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		const actionToggle = getByTestId('data-store-card-actions');
		expect(actionToggle).toBeInTheDocument();
	});

	it('should render actions when read-only', () => {
		const { getByTestId } = renderComponent({
			props: {
				isReadOnly: true,
			},
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		const actionToggle = getByTestId('data-store-card-actions');
		expect(actionToggle).toBeInTheDocument();
	});

	it('should emit rename event when rename action is triggered', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		// Click on the action toggle to open dropdown
		await userEvent.click(getByTestId('data-store-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the rename action
		await userEvent.click(getByTestId(`action-${DATA_STORE_CARD_ACTIONS.RENAME}`));

		expect(emitted().rename).toBeTruthy();
		expect(emitted().rename[0]).toEqual([
			{
				dataStore: mockDataStore,
				action: 'rename',
			},
		]);
	});

	it('should show confirmation dialog when delete action is triggered', async () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		// Click on the action toggle to open dropdown
		await userEvent.click(getByTestId('data-store-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_STORE_CARD_ACTIONS.DELETE}`));

		expect(mockMessage.confirm).toHaveBeenCalledWith(
			'Are you sure that you want to delete "Test DataStore"?',
			'Delete Data Store',
			{
				confirmButtonText: 'Delete',
				cancelButtonText: 'Cancel',
			},
		);
	});

	it('should call delete when confirmed and emit onDeleted', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		// Click on the action toggle to open dropdown
		await userEvent.click(getByTestId('data-store-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_STORE_CARD_ACTIONS.DELETE}`));

		expect(mockDeleteDataStore).toHaveBeenCalledWith('1', 'project-1');
		expect(emitted().onDeleted).toBeTruthy();
	});

	it('should not delete when confirmation is cancelled', async () => {
		mockMessage.confirm.mockResolvedValue('cancel');

		const { getByTestId, emitted } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		// Click on the action toggle to open dropdown
		await userEvent.click(getByTestId('data-store-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_STORE_CARD_ACTIONS.DELETE}`));

		expect(mockDeleteDataStore).not.toHaveBeenCalled();
		expect(emitted().onDeleted).toBeFalsy();
	});

	it('should show error when delete fails', async () => {
		mockDeleteDataStore.mockResolvedValue(false);

		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		// Click on the action toggle to open dropdown
		await userEvent.click(getByTestId('data-store-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_STORE_CARD_ACTIONS.DELETE}`));

		expect(mockToast.showError).toHaveBeenCalledWith(
			expect.any(Error),
			'Something went wrong while deleting the data store.',
		);
	});

	it('should show error when delete throws exception', async () => {
		const deleteError = new Error('Delete failed');
		mockDeleteDataStore.mockRejectedValue(deleteError);

		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		// Click on the action toggle to open dropdown
		await userEvent.click(getByTestId('data-store-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_STORE_CARD_ACTIONS.DELETE}`));

		expect(mockToast.showError).toHaveBeenCalledWith(
			deleteError,
			'Something went wrong while deleting the data store.',
		);
	});
});
