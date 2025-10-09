import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import DataTableActions from '@/features/dataTable/components/DataTableActions.vue';
import { DATA_TABLE_CARD_ACTIONS } from '@/features/dataTable/constants';
import { MODAL_CONFIRM } from '@/constants';
import type { DataTable } from '@/features/dataTable/dataTable.types';

const mockMessage = {
	confirm: vi.fn(),
};

const mockToast = {
	showError: vi.fn(),
};

const mockDeleteDataTable = vi.fn();

vi.mock('@/composables/useMessage', () => ({
	useMessage: () => mockMessage,
}));

vi.mock('@/composables/useToast', () => ({
	useToast: () => mockToast,
}));

vi.mock('@/features/dataTable/dataTable.store', () => ({
	useDataTableStore: () => ({
		deleteDataTable: mockDeleteDataTable,
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
			if (key === 'dataTable.delete.confirm.message')
				return `Are you sure that you want to delete "${options?.interpolate?.name}"?`;
			if (key === 'dataTable.delete.confirm.title') return 'Delete Data Table';
			if (key === 'dataTable.delete.error')
				return 'Something went wrong while deleting the data table.';
			return key;
		},
	}),
}));

const mockDataTable: DataTable = {
	id: '1',
	name: 'Test DataTable',
	sizeBytes: 1024,
	columns: [],
	createdAt: '2023-01-01T00:00:00.000Z',
	updatedAt: '2023-01-01T00:00:00.000Z',
	projectId: 'project-1',
};

const renderComponent = createComponentRenderer(DataTableActions, {
	props: {
		dataTable: mockDataTable,
		isReadOnly: false,
		location: 'breadcrumbs',
	},
});

describe('DataTableActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteDataTable.mockResolvedValue(true);
		mockMessage.confirm.mockResolvedValue(MODAL_CONFIRM);
	});

	it('should render N8nActionToggle with correct props', () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		const actionToggle = getByTestId('data-table-card-actions');
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

		const actionToggle = getByTestId('data-table-card-actions');
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
		await userEvent.click(getByTestId('data-table-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the rename action
		await userEvent.click(getByTestId(`action-${DATA_TABLE_CARD_ACTIONS.RENAME}`));

		expect(emitted().rename).toBeTruthy();
		expect(emitted().rename[0]).toEqual([
			{
				dataTable: mockDataTable,
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
		await userEvent.click(getByTestId('data-table-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_TABLE_CARD_ACTIONS.DELETE}`));

		expect(mockMessage.confirm).toHaveBeenCalledWith(
			'Are you sure that you want to delete "Test DataTable"?',
			'Delete Data Table',
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
		await userEvent.click(getByTestId('data-table-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_TABLE_CARD_ACTIONS.DELETE}`));

		expect(mockDeleteDataTable).toHaveBeenCalledWith('1', 'project-1');
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
		await userEvent.click(getByTestId('data-table-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_TABLE_CARD_ACTIONS.DELETE}`));

		expect(mockDeleteDataTable).not.toHaveBeenCalled();
		expect(emitted().onDeleted).toBeFalsy();
	});

	it('should show error when delete fails', async () => {
		mockDeleteDataTable.mockResolvedValue(false);

		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		// Click on the action toggle to open dropdown
		await userEvent.click(getByTestId('data-table-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_TABLE_CARD_ACTIONS.DELETE}`));

		expect(mockToast.showError).toHaveBeenCalledWith(
			expect.any(Error),
			'Something went wrong while deleting the data table.',
		);
	});

	it('should show error when delete throws exception', async () => {
		const deleteError = new Error('Delete failed');
		mockDeleteDataTable.mockRejectedValue(deleteError);

		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {},
				stubActions: false,
			}),
		});

		// Click on the action toggle to open dropdown
		await userEvent.click(getByTestId('data-table-card-actions'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		// Click on the delete action
		await userEvent.click(getByTestId(`action-${DATA_TABLE_CARD_ACTIONS.DELETE}`));

		expect(mockToast.showError).toHaveBeenCalledWith(
			deleteError,
			'Something went wrong while deleting the data table.',
		);
	});

	describe('rename action visibility', () => {
		it('should show rename action when location is breadcrumbs', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					dataTable: mockDataTable,
					isReadOnly: false,
					location: 'breadcrumbs',
				},
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Click on the action toggle to open dropdown
			await userEvent.click(getByTestId('data-table-card-actions'));
			expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

			// Check that rename action is present
			expect(queryByTestId(`action-${DATA_TABLE_CARD_ACTIONS.RENAME}`)).toBeInTheDocument();
		});

		it('should not show rename action when location is card', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					dataTable: mockDataTable,
					isReadOnly: false,
					location: 'card',
				},
				pinia: createTestingPinia({
					initialState: {},
					stubActions: false,
				}),
			});

			// Click on the action toggle to open dropdown
			await userEvent.click(getByTestId('data-table-card-actions'));
			expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

			// Check that rename action is NOT present
			expect(queryByTestId(`action-${DATA_TABLE_CARD_ACTIONS.RENAME}`)).not.toBeInTheDocument();
			// But delete action should still be present
			expect(queryByTestId(`action-${DATA_TABLE_CARD_ACTIONS.DELETE}`)).toBeInTheDocument();
		});
	});
});
