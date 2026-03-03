import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import BinaryDataViewModal from './BinaryDataViewModal.vue';
import { BINARY_DATA_VIEW_MODAL_KEY } from '@/app/constants';
import type { BinaryMetadata } from '@/Interface';

vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		name: 'Modal',
		template: '<div data-test-id="modal"><slot name="content" /></div>',
		props: ['name', 'title', 'width', 'height', 'center'],
	},
}));

const createBinaryMetadata = (overrides: Partial<BinaryMetadata> = {}): BinaryMetadata => ({
	data: '',
	id: 'test-binary-id',
	mimeType: 'text/plain',
	fileName: 'test.txt',
	fileType: undefined,
	...overrides,
});

describe('BinaryDataViewModal.vue', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;

	const renderComponent = createComponentRenderer(BinaryDataViewModal, {
		pinia: createTestingPinia({
			initialState: {
				ui: {
					modalsById: {
						[BINARY_DATA_VIEW_MODAL_KEY]: {
							open: true,
						},
					},
				},
			},
		}),
	});

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
	});

	describe('File Type Detection', () => {
		it('should detect image file type from mimeType', () => {
			const binaryData = createBinaryMetadata({ mimeType: 'image/png' });
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.image')).toBeInTheDocument();
		});

		it('should detect audio file type from mimeType', () => {
			const binaryData = createBinaryMetadata({ mimeType: 'audio/mp3' });
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.audio')).toBeInTheDocument();
		});

		it('should detect video file type from mimeType', () => {
			const binaryData = createBinaryMetadata({ mimeType: 'video/mp4' });
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.video')).toBeInTheDocument();
		});

		it('should detect PDF file type from mimeType', () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/pdf' });
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.pdf')).toBeInTheDocument();
		});

		it('should detect JSON file type from mimeType', () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/json' });
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.json')).toBeInTheDocument();
		});

		it('should detect HTML file type from mimeType', () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/html' });
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.html')).toBeInTheDocument();
		});

		it('should detect markdown file type from mimeType', () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/markdown' });
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.markdown')).toBeInTheDocument();
		});

		it('should detect text file type from mimeType', () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.text')).toBeInTheDocument();
		});

		it('should default to other file type for unknown mimeType', () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/octet-stream' });
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.other')).toBeInTheDocument();
		});

		it('should use fileType when mimeType is not provided', () => {
			const binaryData = createBinaryMetadata({
				mimeType: undefined,
				fileType: 'image',
			});
			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(container.querySelector('.binary-data-modal-content.image')).toBeInTheDocument();
		});
	});

	describe('Loading State', () => {
		it('should show loading message initially', () => {
			const binaryData = createBinaryMetadata();
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');

			const { getByText } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			expect(getByText('Loading binary data...')).toBeInTheDocument();
		});

		it('should hide loading message after data loads', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue('test content'),
			});

			const { queryByText } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(queryByText('Loading binary data...')).not.toBeInTheDocument();
			});
		});
	});

	describe('Error State', () => {
		it('should show error message when fetch fails', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fetch failed'));

			const { getByText } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(getByText('Error loading binary data')).toBeInTheDocument();
			});
		});
	});

	describe('Binary Data Fetching', () => {
		it('should fetch text data and display it', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			const testContent = 'This is test content';
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue(testContent),
			});

			const { getByText } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(getByText(testContent)).toBeInTheDocument();
			});

			expect(workflowsStore.getBinaryUrl).toHaveBeenCalledWith(
				'test-binary-id',
				'download',
				'test.txt',
				'text/plain',
			);
		});

		it('should fetch JSON data and display it', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/json' });
			const jsonData = { key: 'value', nested: { prop: 'data' } };
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				json: vi.fn().mockResolvedValue(jsonData),
			});

			renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith('http://test.com/binary', {
					credentials: 'include',
				});
			});
		});

		it('should fetch HTML data and display it', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/html' });
			const htmlContent = '<div>Test HTML</div>';
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue(htmlContent),
			});

			renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith('http://test.com/binary', {
					credentials: 'include',
				});
			});

			expect(workflowsStore.getBinaryUrl).toHaveBeenCalledWith(
				'test-binary-id',
				'download',
				'test.txt',
				'text/html',
			);
		});

		it('should fetch markdown data and display it', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/markdown' });
			const markdownContent = '# Test Markdown';
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue(markdownContent),
			});

			renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith('http://test.com/binary', {
					credentials: 'include',
				});
			});

			expect(workflowsStore.getBinaryUrl).toHaveBeenCalledWith(
				'test-binary-id',
				'view',
				'test.txt',
				'text/markdown',
			);
		});

		it('should use view action for non-text file types', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'image/png' });
			const binaryUrl = 'http://test.com/binary-image';
			workflowsStore.getBinaryUrl.mockReturnValue(binaryUrl);

			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(workflowsStore.getBinaryUrl).toHaveBeenCalledWith(
					'test-binary-id',
					'view',
					'test.txt',
					'image/png',
				);
			});

			await waitFor(() => {
				const img = container.querySelector('img');
				expect(img).toBeInTheDocument();
				expect(img?.src).toBe(binaryUrl);
			});
		});
	});

	describe('Content Rendering', () => {
		it('should render video element for video files', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'video/mp4' });
			const videoUrl = 'http://test.com/video.mp4';
			workflowsStore.getBinaryUrl.mockReturnValue(videoUrl);

			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const video = container.querySelector('video');
				expect(video).toBeInTheDocument();
				expect(video?.querySelector('source')?.src).toBe(videoUrl);
				expect(video?.querySelector('source')?.type).toBe('video/mp4');
			});
		});

		it('should render audio element for audio files', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'audio/mp3' });
			const audioUrl = 'http://test.com/audio.mp3';
			workflowsStore.getBinaryUrl.mockReturnValue(audioUrl);

			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const audio = container.querySelector('audio');
				expect(audio).toBeInTheDocument();
				expect(audio?.querySelector('source')?.src).toBe(audioUrl);
				expect(audio?.querySelector('source')?.type).toBe('audio/mp3');
			});
		});

		it('should render image element for image files', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'image/jpeg' });
			const imageUrl = 'http://test.com/image.jpg';
			workflowsStore.getBinaryUrl.mockReturnValue(imageUrl);

			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const img = container.querySelector('img');
				expect(img).toBeInTheDocument();
				expect(img?.src).toBe(imageUrl);
			});
		});

		it('should render embed element for PDF files', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/pdf' });
			const pdfUrl = 'http://test.com/document.pdf';

			const mockObjectUrl = 'blob:http://test.com/mock-blob-url';
			global.URL.createObjectURL = vi.fn(() => mockObjectUrl);
			global.URL.revokeObjectURL = vi.fn();

			const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				blob: async () => mockBlob,
			});

			workflowsStore.getBinaryUrl.mockReturnValue(pdfUrl);

			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const embed = container.querySelector('embed');
				expect(embed).toBeInTheDocument();
				expect(embed?.classList.contains('binary-data')).toBe(true);
				expect(embed?.src).toBe(mockObjectUrl);
			});
		});

		it('should render pre element for text files', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			const textContent = 'Line 1\nLine 2\nLine 3';
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/text.txt');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue(textContent),
			});

			const { container } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const pre = container.querySelector('pre.text-content');
				expect(pre).toBeInTheDocument();
				expect(pre?.textContent?.trim()).toBe(textContent);
			});
		});

		it('should show preview not available for other file types', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/zip' });
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/file.zip');

			const { getByText } = renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(getByText('Preview not available for this file type')).toBeInTheDocument();
			});
		});
	});

	describe('Props Changes', () => {
		it('should reload data when binaryData prop changes', async () => {
			const binaryData1 = createBinaryMetadata({ id: 'binary-1', mimeType: 'text/plain' });
			const binaryData2 = createBinaryMetadata({ id: 'binary-2', mimeType: 'text/plain' });

			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue('content'),
			});

			const { rerender } = renderComponent({
				props: {
					data: { binaryData: binaryData1 },
				},
			});

			await waitFor(() => {
				expect(workflowsStore.getBinaryUrl).toHaveBeenCalledTimes(1);
			});

			await rerender({ data: { binaryData: binaryData2 } });

			await waitFor(() => {
				expect(workflowsStore.getBinaryUrl).toHaveBeenCalledTimes(2);
				expect(workflowsStore.getBinaryUrl).toHaveBeenLastCalledWith(
					'binary-2',
					'download',
					'test.txt',
					'text/plain',
				);
			});
		});
	});

	describe('URL Generation', () => {
		it('should call getBinaryUrl with correct parameters for download action', async () => {
			const binaryData = createBinaryMetadata({
				id: 'test-id',
				mimeType: 'text/html',
				fileName: 'document.html',
			});
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue('<html></html>'),
			});

			renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(workflowsStore.getBinaryUrl).toHaveBeenCalledWith(
					'test-id',
					'download',
					'document.html',
					'text/html',
				);
			});
		});

		it('should call getBinaryUrl with correct parameters for view action', async () => {
			const binaryData = createBinaryMetadata({
				id: 'test-id',
				mimeType: 'image/png',
				fileName: 'picture.png',
			});
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');

			renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(workflowsStore.getBinaryUrl).toHaveBeenCalledWith(
					'test-id',
					'view',
					'picture.png',
					'image/png',
				);
			});
		});

		it('should handle missing fileName', async () => {
			const binaryData = createBinaryMetadata({
				id: 'test-id',
				mimeType: 'image/png',
				fileName: undefined,
			});
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');

			renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(workflowsStore.getBinaryUrl).toHaveBeenCalledWith(
					'test-id',
					'view',
					'',
					'image/png',
				);
			});
		});

		it('should handle missing mimeType', async () => {
			const binaryData = createBinaryMetadata({
				id: 'test-id',
				mimeType: undefined,
				fileName: 'file.bin',
				fileType: 'other',
			});
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');

			renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(workflowsStore.getBinaryUrl).toHaveBeenCalledWith('test-id', 'view', 'file.bin', '');
			});
		});
	});

	describe('Fetch Options', () => {
		it('should include credentials in fetch request', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue('content'),
			});

			renderComponent({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith('http://test.com/binary', {
					credentials: 'include',
				});
			});
		});
	});
});
