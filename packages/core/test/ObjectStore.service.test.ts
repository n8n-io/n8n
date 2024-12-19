import axios from 'axios';
import { mock } from 'jest-mock-extended';
import { Readable } from 'stream';

import { ObjectStoreService } from '@/ObjectStore/ObjectStore.service.ee';
import { writeBlockedMessage } from '@/ObjectStore/utils';

jest.mock('axios');

const mockAxios = axios as jest.Mocked<typeof axios>;

const mockBucket = { region: 'us-east-1', name: 'test-bucket' };
const mockHost = `s3.${mockBucket.region}.amazonaws.com`;
const mockCredentials = { accessKey: 'mock-access-key', accessSecret: 'mock-secret-key' };
const mockUrl = `https://${mockHost}/${mockBucket.name}`;
const FAILED_REQUEST_ERROR_MESSAGE = 'Request to S3 failed';
const mockError = new Error('Something went wrong!');
const fileId =
	'workflows/ObogjVbqpNOQpiyV/executions/999/binary_data/71f6209b-5d48-41a2-a224-80d529d8bb32';
const mockBuffer = Buffer.from('Test data');

const toDeletionXml = (filename: string) => `<Delete>
<Object><Key>${filename}</Key></Object>
</Delete>`;

let objectStoreService: ObjectStoreService;

beforeEach(async () => {
	objectStoreService = new ObjectStoreService(mock());
	mockAxios.request.mockResolvedValueOnce({ status: 200 }); // for checkConnection
	await objectStoreService.init(mockHost, mockBucket, mockCredentials);
	jest.restoreAllMocks();
});

describe('checkConnection()', () => {
	it('should send a HEAD request to the correct host', async () => {
		mockAxios.request.mockResolvedValue({ status: 200 });

		objectStoreService.setReady(false);

		await objectStoreService.checkConnection();

		expect(mockAxios.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'HEAD',
				url: `https://${mockHost}/${mockBucket.name}`,
				headers: expect.objectContaining({
					'X-Amz-Content-Sha256': expect.any(String),
					'X-Amz-Date': expect.any(String),
					Authorization: expect.any(String),
				}),
			}),
		);
	});

	it('should throw an error on request failure', async () => {
		objectStoreService.setReady(false);

		mockAxios.request.mockRejectedValue(mockError);

		const promise = objectStoreService.checkConnection();

		await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
	});
});

describe('getMetadata()', () => {
	it('should send a HEAD request to the correct host and path', async () => {
		mockAxios.request.mockResolvedValue({ status: 200 });

		await objectStoreService.getMetadata(fileId);

		expect(mockAxios.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'HEAD',
				url: `${mockUrl}/${fileId}`,
				headers: expect.objectContaining({
					Host: mockHost,
					'X-Amz-Content-Sha256': expect.any(String),
					'X-Amz-Date': expect.any(String),
					Authorization: expect.any(String),
				}),
			}),
		);
	});

	it('should throw an error on request failure', async () => {
		mockAxios.request.mockRejectedValue(mockError);

		const promise = objectStoreService.getMetadata(fileId);

		await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
	});
});

describe('put()', () => {
	it('should send a PUT request to upload an object', async () => {
		const metadata = { fileName: 'file.txt', mimeType: 'text/plain' };

		mockAxios.request.mockResolvedValue({ status: 200 });

		await objectStoreService.put(fileId, mockBuffer, metadata);

		expect(mockAxios.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'PUT',
				url: `${mockUrl}/${fileId}`,
				headers: expect.objectContaining({
					'Content-Length': mockBuffer.length,
					'Content-MD5': expect.any(String),
					'x-amz-meta-filename': metadata.fileName,
					'Content-Type': metadata.mimeType,
				}),
				data: mockBuffer,
			}),
		);
	});

	it('should block if read-only', async () => {
		objectStoreService.setReadonly(true);

		const metadata = { fileName: 'file.txt', mimeType: 'text/plain' };

		const promise = objectStoreService.put(fileId, mockBuffer, metadata);

		await expect(promise).resolves.not.toThrow();

		const result = await promise;

		expect(result.status).toBe(403);
		expect(result.statusText).toBe('Forbidden');

		expect(result.data).toBe(writeBlockedMessage(fileId));
	});

	it('should throw an error on request failure', async () => {
		const metadata = { fileName: 'file.txt', mimeType: 'text/plain' };

		mockAxios.request.mockRejectedValue(mockError);

		const promise = objectStoreService.put(fileId, mockBuffer, metadata);

		await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
	});
});

describe('get()', () => {
	it('should send a GET request to download an object as a buffer', async () => {
		const fileId = 'file.txt';

		mockAxios.request.mockResolvedValue({ status: 200, data: Buffer.from('Test content') });

		const result = await objectStoreService.get(fileId, { mode: 'buffer' });

		expect(mockAxios.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: `${mockUrl}/${fileId}`,
				responseType: 'arraybuffer',
			}),
		);

		expect(Buffer.isBuffer(result)).toBe(true);
	});

	it('should send a GET request to download an object as a stream', async () => {
		mockAxios.request.mockResolvedValue({ status: 200, data: new Readable() });

		const result = await objectStoreService.get(fileId, { mode: 'stream' });

		expect(mockAxios.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: `${mockUrl}/${fileId}`,
				responseType: 'stream',
			}),
		);

		expect(result instanceof Readable).toBe(true);
	});

	it('should throw an error on request failure', async () => {
		mockAxios.request.mockRejectedValue(mockError);

		const promise = objectStoreService.get(fileId, { mode: 'buffer' });

		await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
	});
});

describe('deleteOne()', () => {
	it('should send a DELETE request to delete a single object', async () => {
		mockAxios.request.mockResolvedValue({ status: 204 });

		await objectStoreService.deleteOne(fileId);

		expect(mockAxios.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'DELETE',
				url: `${mockUrl}/${fileId}`,
			}),
		);
	});

	it('should throw an error on request failure', async () => {
		mockAxios.request.mockRejectedValue(mockError);

		const promise = objectStoreService.deleteOne(fileId);

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

		expect(objectStoreService.list).toHaveBeenCalledWith(prefix);
		expect(mockAxios.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				url: `${mockUrl}/?delete`,
				headers: expect.objectContaining({
					'Content-Type': 'application/xml',
					'Content-Length': expect.any(Number),
					'Content-MD5': expect.any(String),
				}),
				data: toDeletionXml(fileName),
			}),
		);
	});

	it('should not send a deletion request if no prefix match', async () => {
		objectStoreService.list = jest.fn().mockResolvedValue([]);

		const result = await objectStoreService.deleteMany('non-matching-prefix');

		expect(result).toBeUndefined();
	});

	it('should throw an error on request failure', async () => {
		mockAxios.request.mockRejectedValue(mockError);

		const promise = objectStoreService.deleteMany('test-dir/');

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
		mockAxios.request.mockRejectedValue(mockError);

		const promise = objectStoreService.list('test-dir/');

		await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
	});
});
