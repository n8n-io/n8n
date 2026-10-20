import { waitFor } from '@testing-library/vue';
import { nextTick } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import BinaryDataViewModal from './BinaryDataViewModal.vue';
import { BINARY_DATA_VIEW_MODAL_KEY } from '@/app/constants';
import type { BinaryMetadata } from '@/Interface';

const createBinaryMetadata = (overrides: Partial<BinaryMetadata> = {}): BinaryMetadata => ({
	data: '',
	id: 'test-binary-id',
	mimeType: 'text/plain',
	fileName: 'test.txt',
	fileType: undefined,
	...overrides,
});

describe('BinaryDataViewModal.vue', async () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;

	const renderComponent = createComponentRenderer(BinaryDataViewModal, {
		pinia: createTestingPinia({
			initialState: {
				ui: {
					modalStateById: {
						[BINARY_DATA_VIEW_MODAL_KEY]: {
							open: true,
						},
					},
				},
			},
		}),
	});

	async function renderOpenModal(options: Parameters<typeof renderComponent>[0]) {
		const rendered = renderComponent(options);
		await nextTick();
		return rendered;
	}

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
	});

	describe('File Type Detection', async () => {
		it('should detect image file type from mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'image/png' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.image')).toBeInTheDocument();
		});

		it('should detect audio file type from mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'audio/mp3' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.audio')).toBeInTheDocument();
		});

		it('should detect video file type from mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'video/mp4' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.video')).toBeInTheDocument();
		});

		it('should detect PDF file type from mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/pdf' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.pdf')).toBeInTheDocument();
		});

		it('should detect JSON file type from mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/json' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.json')).toBeInTheDocument();
		});

		it.each(['application/pdfx', 'application/jsonx', 'text/htmlx'])(
			'should not treat %s as the type its name starts with',
			async (mimeType) => {
				const binaryData = createBinaryMetadata({ mimeType, fileType: 'pdf' });
				workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');

				await renderOpenModal({
					props: {
						data: { binaryData },
					},
				});

				expect(
					document.body.querySelector('.binary-data-modal-content.pdf'),
				).not.toBeInTheDocument();
				expect(
					document.body.querySelector('.binary-data-modal-content.json'),
				).not.toBeInTheDocument();
				expect(
					document.body.querySelector('.binary-data-modal-content.html'),
				).not.toBeInTheDocument();
			},
		);

		it('should detect JSON file type from a text/json mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/json' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.json')).toBeInTheDocument();
		});

		it('should detect HTML file type from mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/html' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.html')).toBeInTheDocument();
		});

		it('should detect markdown file type from mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/markdown' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(
				document.body.querySelector('.binary-data-modal-content.markdown'),
			).toBeInTheDocument();
		});

		it('should keep an html mimeType that carries a markdown parameter as html', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/html; x=markdown' });
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue('<div>hi</div>'),
			});

			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.html')).toBeInTheDocument();
		});

		it('should detect text file type from mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.text')).toBeInTheDocument();
		});

		it('should default to other file type for unknown mimeType', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/octet-stream' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.other')).toBeInTheDocument();
		});

		it('should ignore the declared fileType when mimeType is not provided', async () => {
			const binaryData = createBinaryMetadata({
				mimeType: undefined,
				fileType: 'image',
			});
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.other')).toBeInTheDocument();
		});

		it('should detect text file type from a mimeType carrying parameters', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/csv; charset=utf-8' });
			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			expect(document.body.querySelector('.binary-data-modal-content.text')).toBeInTheDocument();
		});
	});

	describe('Loading State', async () => {
		it('should show loading message initially', async () => {
			const binaryData = createBinaryMetadata();
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

			const { getByText } = await renderOpenModal({
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

			const { queryByText } = await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(queryByText('Loading binary data...')).not.toBeInTheDocument();
			});
		});
	});

	describe('Error State', async () => {
		it('should show error message when fetch fails', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fetch failed'));

			const { getByText } = await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(getByText('Error loading binary data')).toBeInTheDocument();
			});
		});
	});

	describe('Binary Data Fetching', async () => {
		it('should fetch text data and display it', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			const testContent = 'This is test content';
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue(testContent),
			});

			const { getByText } = await renderOpenModal({
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

			await renderOpenModal({
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

			await renderOpenModal({
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

			await renderOpenModal({
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

			await renderOpenModal({
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
				const img = document.body.querySelector('img');
				expect(img).toBeInTheDocument();
				expect(img?.src).toBe(binaryUrl);
			});
		});
	});

	describe('Content Rendering', async () => {
		it('should render video element for video files', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'video/mp4' });
			const videoUrl = 'http://test.com/video.mp4';
			workflowsStore.getBinaryUrl.mockReturnValue(videoUrl);

			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const video = document.body.querySelector('video');
				expect(video).toBeInTheDocument();
				expect(video?.querySelector('source')?.src).toBe(videoUrl);
				expect(video?.querySelector('source')?.type).toBe('video/mp4');
			});
		});

		it('should render audio element for audio files', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'audio/mp3' });
			const audioUrl = 'http://test.com/audio.mp3';
			workflowsStore.getBinaryUrl.mockReturnValue(audioUrl);

			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const audio = document.body.querySelector('audio');
				expect(audio).toBeInTheDocument();
				expect(audio?.querySelector('source')?.src).toBe(audioUrl);
				expect(audio?.querySelector('source')?.type).toBe('audio/mp3');
			});
		});

		it('should render image element for image files', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'image/jpeg' });
			const imageUrl = 'http://test.com/image.jpg';
			workflowsStore.getBinaryUrl.mockReturnValue(imageUrl);

			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const img = document.body.querySelector('img');
				expect(img).toBeInTheDocument();
				expect(img?.src).toBe(imageUrl);
			});
		});

		it('should render an iframe for PDF files', async () => {
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

			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const iframe = document.body.querySelector('iframe');
				expect(iframe).toBeInTheDocument();
				expect(iframe?.classList.contains('binary-data')).toBe(true);
				expect(iframe?.src).toBe(mockObjectUrl);
				expect(document.body.querySelector('embed')).not.toBeInTheDocument();
			});
		});

		it('should render pre element for text files', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			const textContent = 'Line 1\nLine 2\nLine 3';
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/text.txt');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue(textContent),
			});

			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				const pre = document.body.querySelector('pre.text-content');
				expect(pre).toBeInTheDocument();
				expect(pre?.textContent?.trim()).toBe(textContent);
			});
		});

		it('should show preview not available for other file types', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/zip' });
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/file.zip');

			const { getByText } = await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(getByText('Preview not available for this file type')).toBeInTheDocument();
			});
		});
	});

	describe('Props Changes', async () => {
		it('should reload data when binaryData prop changes', async () => {
			const binaryData1 = createBinaryMetadata({ id: 'binary-1', mimeType: 'text/plain' });
			const binaryData2 = createBinaryMetadata({ id: 'binary-2', mimeType: 'text/plain' });

			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue('content'),
			});

			const { rerender } = await renderOpenModal({
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

	describe('URL Generation', async () => {
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

			await renderOpenModal({
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

			await renderOpenModal({
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

			await renderOpenModal({
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

			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(workflowsStore.getBinaryUrl).toHaveBeenCalledWith('test-id', 'view', 'file.bin', '');
			});
		});
	});

	describe('Fetch Options', async () => {
		it('should include credentials in fetch request', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'text/plain' });
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				text: vi.fn().mockResolvedValue('content'),
			});

			await renderOpenModal({
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

	describe('Preview hardening', async () => {
		it.each([
			['unrecognised', 'application/xhtml+xml'],
			['empty', ''],
		])(
			'should not preview a file whose mimeType is %s even when fileType says pdf',
			async (_, mimeType) => {
				const binaryData = createBinaryMetadata({
					mimeType,
					fileName: 'report.pdf',
					fileType: 'pdf',
				});
				workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/binary');
				const createObjectURL = vi.fn((_blob: Blob) => 'blob:http://test.com/mock-blob-url');
				global.URL.createObjectURL = createObjectURL;

				const { getByText } = await renderOpenModal({
					props: {
						data: { binaryData },
					},
				});

				await waitFor(() => {
					expect(getByText('Preview not available for this file type')).toBeInTheDocument();
				});

				expect(document.body.querySelector('iframe')).not.toBeInTheDocument();
				expect(createObjectURL).not.toHaveBeenCalled();
			},
		);

		it('should build the pdf object url with an explicit pdf type', async () => {
			const binaryData = createBinaryMetadata({ mimeType: 'application/pdf' });
			const createObjectURL = vi.fn((_blob: Blob) => 'blob:http://test.com/mock-blob-url');
			global.URL.createObjectURL = createObjectURL;
			global.URL.revokeObjectURL = vi.fn();
			// The response echoes the stored MIME type, so the blob must not take its type from it.
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				blob: async () => new Blob(['pdf content'], { type: 'application/xhtml+xml' }),
			});
			workflowsStore.getBinaryUrl.mockReturnValue('http://test.com/document.pdf');

			await renderOpenModal({
				props: {
					data: { binaryData },
				},
			});

			await waitFor(() => {
				expect(createObjectURL).toHaveBeenCalled();
			});

			const [blob] = createObjectURL.mock.calls[0];
			expect(blob.type).toBe('application/pdf');
		});
	});
});
