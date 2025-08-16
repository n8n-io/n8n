import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import BinaryDataDisplayEmbed from '@/components/BinaryDataDisplayEmbed.vue';
import type { IBinaryData } from 'n8n-workflow';

const renderComponent = createComponentRenderer(BinaryDataDisplayEmbed);

// Mock the workflows store
vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		getBinaryUrl: vi.fn((id: string, action: string, fileName: string, mimeType: string) => {
			const params = new URLSearchParams();
			params.append('id', id);
			params.append('action', action);
			if (fileName) params.append('fileName', fileName);
			if (mimeType) params.append('mimeType', mimeType);
			return `/rest/binary-data?${params.toString()}`;
		}),
	})),
}));

describe('BinaryDataDisplayEmbed.vue', () => {
	beforeEach(() => {
		// Mock fetch for each test to avoid contamination
		global.fetch = vi.fn();
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Clean up fetch mock after each test
		vi.restoreAllMocks();
	});

	describe('CSV parsing and display', () => {
		it('should render CSV data correctly with simple comma-separated values', async () => {
			const csvData = btoa('Name,Age,City\nJohn,25,Boston\nJane,30,NYC');
			const binaryData: IBinaryData = {
				data: csvData,
				fileName: 'test.csv',
				mimeType: 'text/csv',
			};

			const { container, getByText } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				expect(getByText('Name')).toBeInTheDocument();
				expect(getByText('Age')).toBeInTheDocument();
				expect(getByText('City')).toBeInTheDocument();
				expect(getByText('John')).toBeInTheDocument();
				expect(getByText('25')).toBeInTheDocument();
				expect(getByText('Boston')).toBeInTheDocument();
				expect(getByText('Jane')).toBeInTheDocument();
				expect(getByText('30')).toBeInTheDocument();
				expect(getByText('NYC')).toBeInTheDocument();
			});

			// Check table structure
			const table = container.querySelector('.csv-table');
			expect(table).toBeInTheDocument();

			const headers = container.querySelectorAll('th');
			expect(headers).toHaveLength(3);

			const rows = container.querySelectorAll('tbody tr');
			expect(rows).toHaveLength(2);
		});

		it('should handle CSV with quoted values containing commas', async () => {
			const csvData = btoa(
				'"Last, First",Age,Department\n"Smith, John",25,"Engineering, Software"\n"Doe, Jane",30,Marketing',
			);
			const binaryData: IBinaryData = {
				data: csvData,
				fileName: 'test.csv',
				mimeType: 'text/csv',
			};

			const { getByText } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				// Headers
				expect(getByText('Last, First')).toBeInTheDocument();
				expect(getByText('Age')).toBeInTheDocument();
				expect(getByText('Department')).toBeInTheDocument();

				// Data with commas preserved
				expect(getByText('Smith, John')).toBeInTheDocument();
				expect(getByText('Engineering, Software')).toBeInTheDocument();
				expect(getByText('Doe, Jane')).toBeInTheDocument();
				expect(getByText('Marketing')).toBeInTheDocument();
			});
		});

		it('should handle CSV with escaped quotes', async () => {
			const csvData = btoa('"Name","Description"\n"John ""Johnny"" Smith","He said ""Hello"""');
			const binaryData: IBinaryData = {
				data: csvData,
				fileName: 'test.csv',
				mimeType: 'text/csv',
			};

			const { getByText } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				expect(getByText('Name')).toBeInTheDocument();
				expect(getByText('Description')).toBeInTheDocument();
				expect(getByText('John "Johnny" Smith')).toBeInTheDocument();
				expect(getByText('He said "Hello"')).toBeInTheDocument();
			});
		});

		it('should handle empty CSV fields and trailing commas', async () => {
			const csvData = btoa('Name,Age,City\nJohn,,Boston\nJane,30,\n,25,NYC');
			const binaryData: IBinaryData = {
				data: csvData,
				fileName: 'test.csv',
				mimeType: 'text/csv',
			};

			const { container } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				const cells = container.querySelectorAll('td');
				expect(cells).toHaveLength(9); // 3 rows × 3 columns

				// Check that empty cells are rendered
				expect(cells[1].textContent).toBe(''); // John's age is empty
				expect(cells[5].textContent).toBe(''); // Jane's city is empty
				expect(cells[6].textContent).toBe(''); // Third row's name is empty
			});
		});

		it('should handle CSV with binary data ID (fetched from server)', async () => {
			const csvContent = 'Name,Age\nJohn,25\nJane,30';
			(global.fetch as any).mockResolvedValueOnce({
				text: async () => csvContent,
			});

			const binaryData: IBinaryData = {
				id: 'test-binary-id',
				data: '',
				fileName: 'test.csv',
				mimeType: 'text/csv',
			};

			const { getByText } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				expect(getByText('Name')).toBeInTheDocument();
				expect(getByText('Age')).toBeInTheDocument();
				expect(getByText('John')).toBeInTheDocument();
				expect(getByText('25')).toBeInTheDocument();
			});

			expect(global.fetch).toHaveBeenCalledWith(
				'/rest/binary-data?id=test-binary-id&action=view&fileName=test.csv&mimeType=text%2Fcsv',
				{ credentials: 'include' },
			);
		});

		it('should display empty state for CSV with no data', async () => {
			const csvData = btoa('');
			const binaryData: IBinaryData = {
				data: csvData,
				fileName: 'empty.csv',
				mimeType: 'text/csv',
			};

			const { getByText } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				// The i18n mock in tests returns the actual translated text
				expect(getByText('No CSV data to display')).toBeInTheDocument();
			});
		});

		it('should render CSV table with proper structure and classes', async () => {
			const csvData = btoa('Header1,Header2\nValue1,Value2');
			const binaryData: IBinaryData = {
				data: csvData,
				fileName: 'test.csv',
				mimeType: 'text/csv',
			};

			const { container } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				// Check table structure and CSS classes
				const csvContainer = container.querySelector('.csv-container');
				expect(csvContainer).toBeInTheDocument();

				const table = container.querySelector('.csv-table');
				expect(table).toBeInTheDocument();

				const headers = container.querySelectorAll('th');
				expect(headers).toHaveLength(2);

				const rows = container.querySelectorAll('tbody tr');
				expect(rows).toHaveLength(1);
			});
		});

		it('should handle mixed quoted and unquoted fields', async () => {
			const csvData = btoa('Name,Age,"Location"\nJohn,25,"New York, NY"\n"Jane Smith",30,Boston');
			const binaryData: IBinaryData = {
				data: csvData,
				fileName: 'test.csv',
				mimeType: 'text/csv',
			};

			const { getByText } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				expect(getByText('Location')).toBeInTheDocument();
				expect(getByText('John')).toBeInTheDocument();
				expect(getByText('New York, NY')).toBeInTheDocument();
				expect(getByText('Jane Smith')).toBeInTheDocument();
				expect(getByText('Boston')).toBeInTheDocument();
			});
		});

		it('should handle CSV with only headers', async () => {
			const csvData = btoa('Header1,Header2,Header3');
			const binaryData: IBinaryData = {
				data: csvData,
				fileName: 'headers-only.csv',
				mimeType: 'text/csv',
			};

			const { container, getByText } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				expect(getByText('Header1')).toBeInTheDocument();
				expect(getByText('Header2')).toBeInTheDocument();
				expect(getByText('Header3')).toBeInTheDocument();

				// Should have no tbody rows
				const tbody = container.querySelector('tbody');
				const rows = tbody?.querySelectorAll('tr') || [];
				expect(rows).toHaveLength(0);
			});
		});

		it('should handle error when fetching CSV data', async () => {
			(global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

			const binaryData: IBinaryData = {
				id: 'test-binary-id',
				data: '',
				fileName: 'test.csv',
				mimeType: 'text/csv',
			};

			const { getByText } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				expect(getByText('Error loading binary data')).toBeInTheDocument();
			});
		});

		it('should handle CSV with CRLF line endings and newlines in quoted fields', async () => {
			// Using CRLF (\r\n) line endings and a newline within a quoted field
			const csvData = btoa('Name,Description\r\nJohn,"Line 1\nLine 2"\r\nJane,"Single line"');
			const binaryData: IBinaryData = {
				data: csvData,
				fileName: 'test.csv',
				mimeType: 'text/csv',
			};

			const { container, getByText } = renderComponent({
				props: { binaryData },
				pinia: createTestingPinia(),
			});

			await waitFor(() => {
				// Headers
				expect(getByText('Name')).toBeInTheDocument();
				expect(getByText('Description')).toBeInTheDocument();

				// Data
				expect(getByText('John')).toBeInTheDocument();
				expect(getByText('Jane')).toBeInTheDocument();
				expect(getByText('Single line')).toBeInTheDocument();

				// Check that the multiline text is preserved in the cell
				const cells = container.querySelectorAll('td');
				const multilineCell = Array.from(cells).find((cell) =>
					cell.textContent?.includes('Line 1'),
				);
				expect(multilineCell?.textContent).toBe('Line 1\nLine 2');
			});
		});
	});
});
