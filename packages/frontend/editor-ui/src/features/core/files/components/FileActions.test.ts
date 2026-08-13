import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import FileActions from '@/features/core/files/components/FileActions.vue';
import {
	FILE_CARD_ACTIONS,
	RENAME_FILE_MODAL_KEY,
	REPLACE_FILE_MODAL_KEY,
} from '@/features/core/files/constants';
import { MODAL_CONFIRM } from '@/app/constants';
import type { ProjectFile } from '@/features/core/files/files.types';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';

const mockMessage = {
	confirm: vi.fn(),
};

const mockToast = {
	showError: vi.fn(),
	showMessage: vi.fn(),
};

const mockDeleteFile = vi.fn();
const mockDownloadFile = vi.fn();

const mockFilePermissions = {
	create: true,
	update: true,
	delete: true,
};

let mockQuotaStatus = 'ok';

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => mockMessage,
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => mockToast,
}));

vi.mock('@/features/core/files/files.store', () => ({
	useFilesStore: () => ({
		deleteFile: mockDeleteFile,
		downloadFile: mockDownloadFile,
		fileNameExists: vi.fn().mockResolvedValue(false),
		renameFile: vi.fn(),
		replaceFile: vi.fn(),
		get quotaStatus() {
			return mockQuotaStatus;
		},
		projectPermissions: {
			file: mockFilePermissions,
		},
	}),
}));

vi.mock('@/app/composables/useDependencies', () => ({
	useDependencies: () => ({
		getTotalCount: vi.fn(() => 2),
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: { name?: string; count?: string } }) => {
			if (key === 'generic.rename') return 'Rename';
			if (key === 'generic.delete') return 'Delete';
			if (key === 'generic.cancel') return 'Cancel';
			if (key === 'generic.unknownError') return 'Something went wrong';
			if (key === 'files.actions.preview') return 'Preview';
			if (key === 'files.actions.download') return 'Download';
			if (key === 'files.actions.replace') return 'Replace';
			if (key === 'files.delete.confirm.title') return 'Delete file';
			if (key === 'files.delete.confirm.description')
				return `This permanently deletes '${options?.interpolate?.name}'.`;
			if (key === 'files.delete.confirm.usedBy')
				return `It is used by ${options?.interpolate?.count} workflows.`;
			if (key === 'files.delete.error') return 'Error deleting file';
			return key;
		},
	}),
}));

const mockFile: ProjectFile = {
	id: '1',
	name: 'test.csv',
	mimeType: 'text/csv',
	sizeBytes: 1024,
	projectId: 'project-1',
	createdAt: '2023-01-01T00:00:00.000Z',
	updatedAt: '2023-01-01T00:00:00.000Z',
};

const renderComponent = createComponentRenderer(FileActions, {
	props: {
		file: mockFile,
		isReadOnly: false,
		location: 'card',
	},
	global: {
		stubs: {
			RenameFileModal: { template: '<div />' },
			ReplaceFileModal: { template: '<div />' },
		},
	},
});

const openActionsDropdown = async (getByTestId: (testId: string) => HTMLElement) => {
	const actionToggle = getByTestId('file-card-actions');
	await userEvent.click(within(actionToggle).getByRole('button'));
};

let uiStore: MockedStore<typeof useUIStore>;

describe('FileActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		uiStore = mockedStore(useUIStore);
		mockDeleteFile.mockResolvedValue({ deleted: true, name: mockFile.name });
		mockMessage.confirm.mockResolvedValue(MODAL_CONFIRM);
		mockFilePermissions.update = true;
		mockFilePermissions.delete = true;
		mockQuotaStatus = 'ok';
	});

	it('should render the action toggle', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('file-card-actions')).toBeInTheDocument();
	});

	it('should emit preview when the preview action is triggered', async () => {
		const { getByTestId, emitted } = renderComponent();

		await openActionsDropdown(getByTestId);
		await userEvent.click(getByTestId(`action-${FILE_CARD_ACTIONS.PREVIEW}`));

		expect(emitted().preview).toBeTruthy();
	});

	it('should download the file when the download action is triggered', async () => {
		const { getByTestId } = renderComponent();

		await openActionsDropdown(getByTestId);
		await userEvent.click(getByTestId(`action-${FILE_CARD_ACTIONS.DOWNLOAD}`));

		expect(mockDownloadFile).toHaveBeenCalledWith(mockFile);
	});

	it('should open the rename modal with a file-specific key', async () => {
		const { getByTestId } = renderComponent();

		await openActionsDropdown(getByTestId);
		await userEvent.click(getByTestId(`action-${FILE_CARD_ACTIONS.RENAME}`));

		expect(uiStore.openModal).toHaveBeenCalledWith(`${RENAME_FILE_MODAL_KEY}-${mockFile.id}`);
	});

	it('should open the replace modal with a file-specific key', async () => {
		const { getByTestId } = renderComponent();

		await openActionsDropdown(getByTestId);
		await userEvent.click(getByTestId(`action-${FILE_CARD_ACTIONS.REPLACE}`));

		expect(uiStore.openModal).toHaveBeenCalledWith(`${REPLACE_FILE_MODAL_KEY}-${mockFile.id}`);
	});

	it('should show a confirmation dialog with the used-by count when deleting', async () => {
		const { getByTestId } = renderComponent();

		await openActionsDropdown(getByTestId);
		await userEvent.click(getByTestId(`action-${FILE_CARD_ACTIONS.DELETE}`));

		expect(mockMessage.confirm).toHaveBeenCalledWith(
			"This permanently deletes 'test.csv'. It is used by 2 workflows.",
			'Delete file',
			{
				confirmButtonText: 'Delete',
				cancelButtonText: 'Cancel',
			},
		);
	});

	it('should delete the file when confirmed and emit onDeleted', async () => {
		const { getByTestId, emitted } = renderComponent();

		await openActionsDropdown(getByTestId);
		await userEvent.click(getByTestId(`action-${FILE_CARD_ACTIONS.DELETE}`));

		expect(mockDeleteFile).toHaveBeenCalledWith('1', 'project-1');
		expect(emitted().onDeleted).toBeTruthy();
	});

	it('should not delete when confirmation is cancelled', async () => {
		mockMessage.confirm.mockResolvedValue('cancel');

		const { getByTestId, emitted } = renderComponent();

		await openActionsDropdown(getByTestId);
		await userEvent.click(getByTestId(`action-${FILE_CARD_ACTIONS.DELETE}`));

		expect(mockDeleteFile).not.toHaveBeenCalled();
		expect(emitted().onDeleted).toBeFalsy();
	});

	it('should show an error when delete fails', async () => {
		const deleteError = new Error('Delete failed');
		mockDeleteFile.mockRejectedValue(deleteError);

		const { getByTestId } = renderComponent();

		await openActionsDropdown(getByTestId);
		await userEvent.click(getByTestId(`action-${FILE_CARD_ACTIONS.DELETE}`));

		expect(mockToast.showError).toHaveBeenCalledWith(deleteError, 'Error deleting file');
	});

	describe('permission gating', () => {
		it('should hide mutating actions when the user lacks permissions', async () => {
			mockFilePermissions.update = false;
			mockFilePermissions.delete = false;

			const { getByTestId, queryByTestId } = renderComponent();

			await openActionsDropdown(getByTestId);

			expect(queryByTestId(`action-${FILE_CARD_ACTIONS.PREVIEW}`)).toBeInTheDocument();
			expect(queryByTestId(`action-${FILE_CARD_ACTIONS.DOWNLOAD}`)).toBeInTheDocument();
			expect(queryByTestId(`action-${FILE_CARD_ACTIONS.REPLACE}`)).not.toBeInTheDocument();
			expect(queryByTestId(`action-${FILE_CARD_ACTIONS.RENAME}`)).not.toBeInTheDocument();
			expect(queryByTestId(`action-${FILE_CARD_ACTIONS.DELETE}`)).not.toBeInTheDocument();
		});
	});
});
