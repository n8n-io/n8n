import axios from 'axios';
import { ObjectStoreService } from '../src/ObjectStore/ObjectStore.service.ee';
import { Readable } from 'stream';

jest.mock('axios');

const mockAxios = axios as jest.Mocked<typeof axios>;

const MOCK_BUCKET = { region: 'us-east-1', name: 'test-bucket' };
const MOCK_CREDENTIALS = { accountId: 'mock-account-id', secretKey: 'mock-secret-key' };
const FAILED_REQUEST_ERROR_MESSAGE = 'Request to external object storage failed';
const EXPECTED_HOST = `${MOCK_BUCKET.name}.s3.${MOCK_BUCKET.region}.amazonaws.com`;
const MOCK_S3_ERROR = new Error('Something went wrong!');

const toMultipleDeletionXml = (filename: string) => `<Delete>
<Object><Key>${filename}</Key></Object>
</Delete>`;

describe('ObjectStoreService', () => {
	let objectStoreService: ObjectStoreService;

	beforeEach(() => {
		objectStoreService = new ObjectStoreService(MOCK_BUCKET, MOCK_CREDENTIALS);
		jest.restoreAllMocks();
	});

	describe('checkConnection()', () => {
		it('should send a HEAD request to the correct host', async () => {
			mockAxios.request.mockResolvedValue({ status: 200 });

			await objectStoreService.checkConnection();

			expect(mockAxios.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'HEAD',
					url: `https://${EXPECTED_HOST}/`,
					headers: expect.objectContaining({
						'X-Amz-Content-Sha256': expect.any(String),
						'X-Amz-Date': expect.any(String),
						Authorization: expect.any(String),
					}),
				}),
			);
		});

		it('should throw an error on request failure', async () => {
			mockAxios.request.mockRejectedValue(MOCK_S3_ERROR);

			const promise = objectStoreService.checkConnection();

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('getMetadata()', () => {
		it('should send a HEAD request to the correct host and path', async () => {
			const path = 'file.txt';

			mockAxios.request.mockResolvedValue({ status: 200 });

			await objectStoreService.getMetadata(path);

			expect(mockAxios.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'HEAD',
					url: `https://${EXPECTED_HOST}/${path}`,
					headers: expect.objectContaining({
						Host: EXPECTED_HOST,
						'X-Amz-Content-Sha256': expect.any(String),
						'X-Amz-Date': expect.any(String),
						Authorization: expect.any(String),
					}),
				}),
			);
		});

		it('should throw an error on request failure', async () => {
			const path = 'file.txt';

			mockAxios.request.mockRejectedValue(MOCK_S3_ERROR);

			const promise = objectStoreService.getMetadata(path);

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('put()', () => {
		it('should send a PUT request to upload an object', async () => {
			const path = 'file.txt';
			const buffer = Buffer.from('Test content');
			const metadata = { fileName: path, mimeType: 'text/plain' };

			mockAxios.request.mockResolvedValue({ status: 200 });

			await objectStoreService.put(path, buffer, metadata);

			expect(mockAxios.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'PUT',
					url: `https://${EXPECTED_HOST}/${path}`,
					headers: expect.objectContaining({
						'Content-Length': buffer.length,
						'Content-MD5': expect.any(String),
						'x-amz-meta-filename': metadata.fileName,
						'Content-Type': metadata.mimeType,
					}),
					data: buffer,
				}),
			);
		});

		it('should throw an error on request failure', async () => {
			const path = 'file.txt';
			const buffer = Buffer.from('Test content');
			const metadata = { fileName: path, mimeType: 'text/plain' };

			mockAxios.request.mockRejectedValue(MOCK_S3_ERROR);

			const promise = objectStoreService.put(path, buffer, metadata);

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('get()', () => {
		it('should send a GET request to download an object as a buffer', async () => {
			const path = 'file.txt';

			mockAxios.request.mockResolvedValue({ status: 200, data: Buffer.from('Test content') });

			const result = await objectStoreService.get(path, { mode: 'buffer' });

			expect(mockAxios.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `https://${EXPECTED_HOST}/${path}`,
					responseType: 'arraybuffer',
				}),
			);

			expect(Buffer.isBuffer(result)).toBe(true);
		});

		it('should send a GET request to download an object as a stream', async () => {
			const path = 'file.txt';

			mockAxios.request.mockResolvedValue({ status: 200, data: new Readable() });

			const result = await objectStoreService.get(path, { mode: 'stream' });

			expect(mockAxios.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `https://${EXPECTED_HOST}/${path}`,
					responseType: 'stream',
				}),
			);

			expect(result instanceof Readable).toBe(true);
		});

		it('should throw an error on request failure', async () => {
			const path = 'file.txt';

			mockAxios.request.mockRejectedValue(MOCK_S3_ERROR);

			const promise = objectStoreService.get(path, { mode: 'buffer' });

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('deleteOne()', () => {
		it('should send a DELETE request to delete an object', async () => {
			const path = 'file.txt';

			mockAxios.request.mockResolvedValue({ status: 204 });

			await objectStoreService.deleteOne(path);

			expect(mockAxios.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'DELETE',
					url: `https://${EXPECTED_HOST}/${path}`,
				}),
			);
		});

		it('should throw an error on request failure', async () => {
			const path = 'file.txt';

			mockAxios.request.mockRejectedValue(MOCK_S3_ERROR);

			const promise = objectStoreService.deleteOne(path);

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('deleteMany()', () => {
		it('should send a POST request to delete multiple objects', async () => {
			const prefix = 'test-dir/';
			const fileName = 'file.txt';

			const mockList = [
				{
					key: fileName,
					lastModified: '2023-09-24T12:34:56Z',
					eTag: 'abc123def456',
					size: 456789,
					storageClass: 'STANDARD',
				},
			];

			objectStoreService.list = jest.fn().mockResolvedValue(mockList);

			mockAxios.request.mockResolvedValue({ status: 204 });

			await objectStoreService.deleteMany(prefix);

			expect(mockAxios.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `https://${EXPECTED_HOST}/?delete`,
					headers: expect.objectContaining({
						'Content-Type': 'application/xml',
						'Content-Length': expect.any(Number),
						'Content-MD5': expect.any(String),
					}),
					data: toMultipleDeletionXml(fileName),
				}),
			);
		});

		it('should throw an error on request failure', async () => {
			const prefix = 'test-dir/';

			mockAxios.request.mockRejectedValue(MOCK_S3_ERROR);

			const promise = objectStoreService.deleteMany(prefix);

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('list()', () => {
		it('should list objects with a common prefix', async () => {
			const prefix = 'test-dir/';

			const mockListPage = {
				contents: [{ key: `${prefix}file1.txt` }, { key: `${prefix}file2.txt` }],
				isTruncated: false,
			};

			objectStoreService.getListPage = jest.fn().mockResolvedValue(mockListPage);

			mockAxios.request.mockResolvedValue({ status: 200 });

			const result = await objectStoreService.list(prefix);

			expect(result).toEqual(mockListPage.contents);
		});

		it('should consolidate pages', async () => {
			const prefix = 'test-dir/';

			const mockFirstListPage = {
				contents: [{ key: `${prefix}file1.txt` }],
				isTruncated: true,
				nextContinuationToken: 'token1',
			};

			const mockSecondListPage = {
				contents: [{ key: `${prefix}file2.txt` }],
				isTruncated: false,
			};

			objectStoreService.getListPage = jest
				.fn()
				.mockResolvedValueOnce(mockFirstListPage)
				.mockResolvedValueOnce(mockSecondListPage);

			mockAxios.request.mockResolvedValue({ status: 200 });

			const result = await objectStoreService.list(prefix);

			expect(result).toEqual([...mockFirstListPage.contents, ...mockSecondListPage.contents]);
		});

		it('should throw an error on request failure', async () => {
			const prefix = 'test-dir/';

			mockAxios.request.mockRejectedValue(MOCK_S3_ERROR);

			const promise = objectStoreService.list(prefix);

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});
});
