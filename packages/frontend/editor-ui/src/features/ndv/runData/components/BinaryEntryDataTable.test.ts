import { createComponentRenderer } from '@/__tests__/render';
import BinaryEntryDataTable from '@/features/ndv/runData/components/BinaryEntryDataTable.vue';
import { createTestingPinia } from '@pinia/testing';
import { cleanup, fireEvent } from '@testing-library/vue';
import type { BinaryMetadata } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { BINARY_DATA_VIEW_MODAL_KEY } from '@/app/constants';

vi.mock('file-saver', () => ({
	saveAs: vi.fn(),
}));

const renderComponent = createComponentRenderer(BinaryEntryDataTable, {
	global: {
		plugins: [createTestingPinia()],
	},
});

describe('BinaryEntryDataTable.vue', () => {
	beforeEach(cleanup);

	const createBinaryMetadata = (overrides: Partial<BinaryMetadata> = {}): BinaryMetadata => ({
		id: 'test-id',
		data: '/binary-data/test-id',
		mimeType: 'application/pdf',
		fileName: 'test-file',
		fileExtension: 'pdf',
		fileSize: '1.2 MB',
		bytes: 1200000,
		...overrides,
	});

	describe('rendering', () => {
		it('renders file icon for non-image files', () => {
			const binaryData = createBinaryMetadata();
			const { container } = renderComponent({
				props: { value: binaryData },
			});

			expect(container.querySelector('.iconWrapper')).toBeInTheDocument();
			expect(container.querySelector('img')).not.toBeInTheDocument();
		});

		it('renders image preview for small image files', () => {
			const workflowsStore = useWorkflowsStore();
			vi.spyOn(workflowsStore, 'getBinaryUrl').mockReturnValue('https://example.com/image.png');

			const binaryData = createBinaryMetadata({
				mimeType: 'image/png',
				fileExtension: 'png',
				bytes: 500000,
			});

			const { container } = renderComponent({
				props: { value: binaryData },
			});

			const img = container.querySelector('img');
			expect(img).toBeInTheDocument();
			expect(img?.getAttribute('src')).toBe('https://example.com/image.png');
		});

		it('does not render image preview for large image files', () => {
			const binaryData = createBinaryMetadata({
				mimeType: 'image/png',
				bytes: 2000000,
			});

			const { container } = renderComponent({
				props: { value: binaryData },
			});

			expect(container.querySelector('.iconWrapper')).toBeInTheDocument();
			expect(container.querySelector('img')).not.toBeInTheDocument();
		});

		it('renders file name correctly', () => {
			const binaryData = createBinaryMetadata({
				fileName: 'my-document',
				fileExtension: 'pdf',
			});

			const { getByText } = renderComponent({
				props: { value: binaryData },
			});

			expect(getByText('my-document.pdf')).toBeInTheDocument();
		});

		it('renders file name with extension when already included', () => {
			const binaryData = createBinaryMetadata({
				fileName: 'my-document.pdf',
				fileExtension: 'pdf',
			});

			const { getByText } = renderComponent({
				props: { value: binaryData },
			});

			expect(getByText('my-document.pdf')).toBeInTheDocument();
		});

		it('renders file metadata', () => {
			const binaryData = createBinaryMetadata({
				mimeType: 'application/pdf',
				fileSize: '2.5 MB',
			});

			const { getByText } = renderComponent({
				props: { value: binaryData },
			});

			expect(getByText('application/pdf, 2.5 MB')).toBeInTheDocument();
		});

		it('renders mimeType without fileSize when fileSize is not provided', () => {
			const binaryData = createBinaryMetadata({
				mimeType: 'text/plain',
				fileSize: undefined,
			});

			const { getByText } = renderComponent({
				props: { value: binaryData },
			});

			expect(getByText('text/plain')).toBeInTheDocument();
		});

		it('applies depth styling correctly', () => {
			const binaryData = createBinaryMetadata();
			const { container } = renderComponent({
				props: {
					value: binaryData,
					depth: 2,
				},
			});

			const containerEl = container.querySelector('.container') as HTMLElement;
			expect(containerEl?.style.marginLeft).toBe('30px');
		});

		it('does not apply margin when depth is 0', () => {
			const binaryData = createBinaryMetadata();
			const { container } = renderComponent({
				props: {
					value: binaryData,
					depth: 0,
				},
			});

			const containerEl = container.querySelector('.container') as HTMLElement;
			expect(containerEl?.style.marginLeft).toBe('0px');
		});
	});

	describe('interactions', () => {
		it('opens view modal when clicking on preview area', async () => {
			const uiStore = useUIStore();
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const binaryData = createBinaryMetadata();
			const { container } = renderComponent({
				props: { value: binaryData },
			});

			const wrapper = container.querySelector('.wrapper') as HTMLElement;
			await fireEvent.click(wrapper);

			expect(openModalSpy).toHaveBeenCalledWith({
				name: BINARY_DATA_VIEW_MODAL_KEY,
				data: {
					binaryData,
				},
			});
		});

		it('opens view modal when clicking on file name', async () => {
			const uiStore = useUIStore();
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const binaryData = createBinaryMetadata();
			const { getByText } = renderComponent({
				props: { value: binaryData },
			});

			await fireEvent.click(getByText('test-file.pdf'));

			expect(openModalSpy).toHaveBeenCalledWith({
				name: BINARY_DATA_VIEW_MODAL_KEY,
				data: {
					binaryData,
				},
			});
		});

		it('downloads file when clicking download icon', async () => {
			const workflowsStore = useWorkflowsStore();
			vi.spyOn(workflowsStore, 'getBinaryUrl').mockReturnValue('https://example.com/file.pdf');

			const { saveAs } = await import('file-saver');

			const mockBlob = new Blob(['file content'], { type: 'application/pdf' });
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					blob: vi.fn().mockResolvedValue(mockBlob),
				}),
			);

			const binaryData = createBinaryMetadata();
			const { container } = renderComponent({
				props: { value: binaryData },
			});

			const downloadButton = container.querySelector('.download') as HTMLElement;
			await fireEvent.click(downloadButton);

			await vi.waitFor(() => {
				expect(saveAs).toHaveBeenCalledWith(mockBlob, 'test-file.pdf');
			});
		});

		it('renders download button', () => {
			const binaryData = createBinaryMetadata();
			const { container } = renderComponent({
				props: { value: binaryData },
			});

			const downloadButton = container.querySelector('.download') as HTMLElement;
			expect(downloadButton).toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('handles missing mimeType', () => {
			const binaryData = createBinaryMetadata({
				mimeType: undefined,
			});

			const { container } = renderComponent({
				props: { value: binaryData },
			});

			expect(container.querySelector('.iconWrapper')).toBeInTheDocument();
		});

		it('handles undefined bytes value', () => {
			const binaryData = createBinaryMetadata({
				mimeType: 'image/png',
				bytes: undefined,
			});

			const { container } = renderComponent({
				props: { value: binaryData },
			});

			expect(container.querySelector('.iconWrapper')).toBeInTheDocument();
			expect(container.querySelector('img')).not.toBeInTheDocument();
		});

		it('constructs correct file URL', () => {
			const workflowsStore = useWorkflowsStore();
			const getBinaryUrlSpy = vi
				.spyOn(workflowsStore, 'getBinaryUrl')
				.mockReturnValue('https://example.com/binary');

			const binaryData = createBinaryMetadata({
				id: 'binary-123',
				fileName: 'report',
				fileExtension: 'xlsx',
				mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});

			renderComponent({
				props: { value: binaryData },
			});

			expect(getBinaryUrlSpy).toHaveBeenCalledWith(
				'binary-123',
				'download',
				'report.xlsx',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			);
		});
	});
});
