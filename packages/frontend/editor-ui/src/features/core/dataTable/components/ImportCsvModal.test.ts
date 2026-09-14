import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { vi } from 'vitest';
import ImportCsvModal from '@/features/core/dataTable/components/ImportCsvModal.vue';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useUIStore } from '@/app/stores/ui.store';

const { showError, showMessage, track } = vi.hoisted(() => ({
	showError: vi.fn(),
	showMessage: vi.fn(),
	track: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (
			key: string,
			options?: { interpolate?: Record<string, string>; adjustToNumber?: number },
		) => {
			const interpolate = options?.interpolate ?? {};
			const texts: Record<string, string> = {
				'dataTable.importCsv.title': 'Import CSV to data table',
				'dataTable.importCsv.description':
					"Column names must match the table's column names. System columns (id, createdAt, updatedAt) found in CSV will be ignored.",
				'dataTable.upload.dropOrClick': 'Drop file here or click to upload',
				'dataTable.upload.uploading': 'Uploading...',
				'dataTable.importCsv.columnMismatch': `The following CSV columns do not match the table: ${interpolate.unrecognized}. The following table columns are missing from CSV: ${interpolate.missing}.`,
				'dataTable.importCsv.unrecognizedColumnsOnly': `The following CSV columns do not match the table: ${interpolate.columns}. Remove them and try again.`,
				'dataTable.importCsv.missingColumnsOnly': `The following table columns are missing from CSV and will be set to null: ${interpolate.columns}.`,
				'dataTable.importCsv.noMatchingColumns': 'No matching columns found.',
				'dataTable.importCsv.readyToImport': `Ready to import ${interpolate.count} rows`,
				'dataTable.importCsv.success': `Successfully imported ${interpolate.count} rows`,
				'dataTable.importCsv.error': 'Failed to import CSV',
				'dataTable.importCsv.importButton': 'Import',
				'generic.cancel': 'Cancel',
			};
			return texts[key] ?? key;
		},
	}),
}));

const mockDataTable: DataTable = {
	id: 'dt-1',
	name: 'Test Table',
	projectId: 'proj-1',
	sizeBytes: 0,
	columns: [
		{ id: 'col-1', name: 'name', type: 'string', index: 0 },
		{ id: 'col-2', name: 'age', type: 'number', index: 1 },
	],
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
};

const renderComponent = createComponentRenderer(ImportCsvModal, {
	props: {
		modalName: 'import-csv-modal',
		dataTable: mockDataTable,
	},
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

type UploadResponse = Awaited<ReturnType<ReturnType<typeof useDataTableStore>['uploadCsvFile']>>;

const firstFile = new File(['name,age\nFirst,1'], 'first.csv', { type: 'text/csv' });
const secondFile = new File(['name,age\nSecond,2'], 'second.csv', { type: 'text/csv' });
const uploadResponse = (id: string): UploadResponse => ({
	id,
	originalName: `${id}.csv`,
	rowCount: 1,
	columnCount: 2,
	columns: [
		{ name: 'name', type: 'string', compatibleTypes: ['string'] },
		{ name: 'age', type: 'number', compatibleTypes: ['number'] },
	],
});

function renderUploads() {
	const first = Promise.withResolvers<UploadResponse>();
	const second = Promise.withResolvers<UploadResponse>();
	const store = mockedStore(useDataTableStore);
	store.uploadCsvFile.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
	store.importCsvToDataTable.mockResolvedValue({
		importedRowCount: 1,
		systemColumnsIgnored: [],
	});
	const rendered = renderComponent();
	const input = rendered.getByTestId('import-csv-upload').querySelector('input');
	if (!input) throw new Error('Upload input is missing');

	return {
		...rendered,
		first,
		second,
		store,
		input,
		user: userEvent.setup(),
		importButton: rendered.getByTestId('import-csv-confirm'),
	};
}

describe('ImportCsvModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		mockedStore(useUIStore).modalsById = { 'import-csv-modal': { open: true } };
	});

	it('should render the upload area', () => {
		const { getByText } = renderComponent();
		expect(getByText('Drop file here or click to upload')).toBeInTheDocument();
	});

	it('should have the import button disabled initially', () => {
		const { getByTestId } = renderComponent();
		const importButton = getByTestId('import-csv-confirm');
		expect(importButton).toBeDisabled();
	});

	it('should emit close when cancel is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('import-csv-cancel'));

		expect(emitted().close).toBeTruthy();
	});

	it('should import the completed upload', async () => {
		const { user, input, first, store, importButton, emitted } = renderUploads();
		await user.upload(input, firstFile);
		expect(store.uploadCsvFile).toHaveBeenCalledWith(firstFile, true);
		expect(importButton).toBeDisabled();

		first.resolve(uploadResponse('first'));
		await flushPromises();
		await user.click(importButton);

		expect(store.importCsvToDataTable).toHaveBeenCalledWith('dt-1', 'proj-1', 'first');
		expect(emitted().imported).toHaveLength(1);
	});

	it('should block import until a replacement upload completes', async () => {
		const { user, input, first, second, store, importButton, getByText, queryByTestId } =
			renderUploads();
		await user.upload(input, firstFile);
		first.resolve(uploadResponse('first'));
		await flushPromises();
		expect(importButton).toBeEnabled();

		await user.upload(input, secondFile);
		expect(getByText('second.csv')).toBeInTheDocument();
		expect(getByText('Uploading...')).toBeInTheDocument();
		expect(queryByTestId('import-csv-ready-to-import')).not.toBeInTheDocument();
		expect(importButton).toBeDisabled();
		await user.click(importButton);
		expect(store.importCsvToDataTable).not.toHaveBeenCalled();

		second.resolve(uploadResponse('second'));
		await flushPromises();
		await user.click(importButton);
		expect(store.importCsvToDataTable).toHaveBeenCalledWith('dt-1', 'proj-1', 'second');
	});

	it('should keep the replacement when an earlier upload completes last', async () => {
		const { user, input, first, second, store, importButton, getByText } = renderUploads();
		await user.upload(input, firstFile);
		await user.upload(input, secondFile);
		second.resolve(uploadResponse('second'));
		await flushPromises();
		first.resolve(uploadResponse('first'));
		await flushPromises();

		expect(getByText('second.csv')).toBeInTheDocument();
		await user.click(importButton);
		expect(store.importCsvToDataTable).toHaveBeenCalledWith('dt-1', 'proj-1', 'second');
	});

	it('should keep the replacement when an earlier upload fails', async () => {
		const { user, input, first, second, store, importButton, getByText } = renderUploads();
		await user.upload(input, firstFile);
		await user.upload(input, secondFile);
		second.resolve(uploadResponse('second'));
		await flushPromises();
		first.reject(new Error('Earlier upload failed'));
		await flushPromises();

		expect(showError).not.toHaveBeenCalled();
		expect(getByText('second.csv')).toBeInTheDocument();
		expect(importButton).toBeEnabled();
		await user.click(importButton);
		expect(store.importCsvToDataTable).toHaveBeenCalledWith('dt-1', 'proj-1', 'second');
	});

	it('should keep loading when an earlier upload completes before the replacement', async () => {
		const { user, input, first, second, importButton, getByText, queryByText } = renderUploads();
		await user.upload(input, firstFile);
		await user.upload(input, secondFile);
		first.resolve(uploadResponse('first'));
		await flushPromises();

		expect(getByText('Uploading...')).toBeInTheDocument();
		expect(importButton).toBeDisabled();
		second.resolve(uploadResponse('second'));
		await flushPromises();
		expect(queryByText('Uploading...')).not.toBeInTheDocument();
		expect(importButton).toBeEnabled();
	});

	it('should clear loading and report the current upload failure', async () => {
		const { user, input, first, importButton, queryByText, getByText } = renderUploads();
		await user.upload(input, firstFile);
		const error = new Error('Upload failed');
		first.reject(error);
		await flushPromises();

		expect(showError).toHaveBeenCalledWith(error, 'dataTable.upload.error');
		expect(queryByText('Uploading...')).not.toBeInTheDocument();
		expect(getByText('Drop file here or click to upload')).toBeInTheDocument();
		expect(importButton).toBeDisabled();
	});

	it.each([
		['cancel', 'success'],
		['cancel', 'error'],
		['modal close', 'success'],
		['modal close', 'error'],
	])('should ignore a late upload result after %s (%s)', async (resetAction, outcome) => {
		const { user, input, first, importButton, getByTestId, queryByText, getByText } =
			renderUploads();
		await user.upload(input, firstFile);
		if (resetAction === 'cancel') {
			await user.click(getByTestId('import-csv-cancel'));
		} else {
			mockedStore(useUIStore).modalsById = { 'import-csv-modal': { open: false } };
			await flushPromises();
		}
		expect(queryByText('Uploading...')).not.toBeInTheDocument();

		if (outcome === 'success') first.resolve(uploadResponse('first'));
		else first.reject(new Error('Upload failed after close'));
		await flushPromises();

		expect(showError).not.toHaveBeenCalled();
		expect(getByText('Drop file here or click to upload')).toBeInTheDocument();
		expect(queryByText('Uploading...')).not.toBeInTheDocument();
		expect(importButton).toBeDisabled();
	});

	it('should ignore an upload error after unmount', async () => {
		const { user, input, first, unmount } = renderUploads();
		await user.upload(input, firstFile);
		unmount();
		first.reject(new Error('Upload failed after unmount'));
		await flushPromises();

		expect(showError).not.toHaveBeenCalled();
	});

	it('should distinguish uploads with the same filename', async () => {
		const { user, input, first, second, store, importButton } = renderUploads();
		const replacement = new File(['name,age\nUpdated,2'], firstFile.name, { type: 'text/csv' });
		await user.upload(input, firstFile);
		await user.upload(input, replacement);
		expect(store.uploadCsvFile).toHaveBeenCalledTimes(2);
		second.resolve(uploadResponse('second'));
		await flushPromises();
		first.resolve(uploadResponse('first'));
		await flushPromises();
		await user.click(importButton);

		expect(store.importCsvToDataTable).toHaveBeenCalledWith('dt-1', 'proj-1', 'second');
	});
});
