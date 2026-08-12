import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import ImportCsvModal from '@/features/core/dataTable/components/ImportCsvModal.vue';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';

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

describe('ImportCsvModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
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
		const { default: userEvent } = await import('@testing-library/user-event');

		await userEvent.click(getByTestId('import-csv-cancel'));

		expect(emitted().close).toBeTruthy();
	});
});
