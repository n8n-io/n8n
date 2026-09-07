import type { Logger } from '@n8n/backend-common';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { AzureBlobConfig } from '../azure-blob.config';
import { AzureBlobService } from '../azure-blob.service.ee';

const { mockBlockBlobClient, mockContainerClient } = vi.hoisted(() => {
	const blockBlob = {
		uploadData: vi.fn(),
		downloadToBuffer: vi.fn(),
		download: vi.fn(),
		getProperties: vi.fn(),
		deleteIfExists: vi.fn(),
	};
	const container = {
		exists: vi.fn(),
		listBlobsFlat: vi.fn(),
		getBlockBlobClient: vi.fn(() => blockBlob),
	};
	return { mockBlockBlobClient: blockBlob, mockContainerClient: container };
});

vi.mock('@azure/storage-blob', () => ({
	BlobServiceClient: {
		fromConnectionString: vi.fn(() => ({ getContainerClient: () => mockContainerClient })),
	},
	StorageSharedKeyCredential: class {},
}));
vi.mock('@azure/identity', () => ({ DefaultAzureCredential: class {} }));

describe('AzureBlobService', () => {
	const logger = mock<Logger>();
	const config = mock<AzureBlobConfig>({
		connectionString: 'conn-str',
		containerName: 'test-container',
	});

	let service: AzureBlobService;

	beforeEach(() => {
		vi.clearAllMocks();
		mockContainerClient.getBlockBlobClient.mockReturnValue(mockBlockBlobClient);
		mockContainerClient.listBlobsFlat.mockReturnValue({
			byPage: () => ({
				next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
			}),
		});
		service = new AzureBlobService(logger, config);
	});

	describe('checkConnection', () => {
		it('should probe access with a single-page list (works with container SAS)', async () => {
			const byPage = vi.fn().mockReturnValue({
				next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
			});
			mockContainerClient.listBlobsFlat.mockReturnValue({ byPage });

			await service.checkConnection();

			expect(mockContainerClient.listBlobsFlat).toHaveBeenCalled();
			expect(byPage).toHaveBeenCalledWith({ maxPageSize: 1 });
			expect(mockContainerClient.exists).not.toHaveBeenCalled();
		});

		it('should map a 404 from list to a missing-container UserError', async () => {
			mockContainerClient.listBlobsFlat.mockReturnValue({
				byPage: () => ({
					next: vi
						.fn()
						.mockRejectedValue(Object.assign(new Error('NotFound'), { statusCode: 404 })),
				}),
			});

			await expect(service.checkConnection()).rejects.toThrow(
				`Azure Blob container "${config.containerName}" does not exist or is not accessible.`,
			);
		});

		it('should wrap non-404 list failures as UnexpectedError', async () => {
			mockContainerClient.listBlobsFlat.mockReturnValue({
				byPage: () => ({
					next: vi
						.fn()
						.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 })),
				}),
			});

			await expect(service.checkConnection()).rejects.toThrow(
				'Request to Azure Blob storage failed: Forbidden',
			);
		});
	});

	describe('put', () => {
		it('should default the content type and omit metadata when no fileName is given', async () => {
			await service.put('blob-name', Buffer.from('data'));

			expect(mockBlockBlobClient.uploadData).toHaveBeenCalledWith(expect.any(Buffer), {
				blobHTTPHeaders: { blobContentType: 'application/octet-stream' },
				metadata: undefined,
			});
		});

		it('should set content type from mimeType and encode fileName into metadata', async () => {
			await service.put('blob-name', Buffer.from('data'), {
				mimeType: 'image/png',
				fileName: 'a b.png',
			});

			expect(mockBlockBlobClient.uploadData).toHaveBeenCalledWith(expect.any(Buffer), {
				blobHTTPHeaders: { blobContentType: 'image/png' },
				metadata: { filename: encodeURIComponent('a b.png') },
			});
		});
	});

	describe('get', () => {
		it('should download to a buffer in buffer mode', async () => {
			const buffer = Buffer.from('hello');
			mockBlockBlobClient.downloadToBuffer.mockResolvedValue(buffer);

			const result = await service.get('blob-name', { mode: 'buffer' });

			expect(result).toBe(buffer);
		});

		it('should return a readable stream in stream mode', async () => {
			mockBlockBlobClient.download.mockResolvedValue({
				readableStreamBody: Readable.from([Buffer.from('chunk')]),
			});

			const result = await service.get('blob-name', { mode: 'stream' });

			expect(result).toBeInstanceOf(Readable);
		});
	});

	describe('getMetadata', () => {
		it('should map blob properties to metadata, decoding fileName', async () => {
			mockBlockBlobClient.getProperties.mockResolvedValue({
				contentLength: 42,
				contentType: 'image/png',
				metadata: { filename: encodeURIComponent('a b.png') },
			});

			const metadata = await service.getMetadata('blob-name');

			expect(metadata).toEqual({ fileSize: 42, mimeType: 'image/png', fileName: 'a b.png' });
		});
	});
});
