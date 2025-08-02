/* eslint-disable @typescript-eslint/naming-convention */
import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	type S3Client,
} from '@aws-sdk/client-s3';
import { captor, mock } from 'jest-mock-extended';
import { Readable } from 'stream';

import type { ObjectStoreConfig } from '../object-store.config';
import { ObjectStoreService } from '../object-store.service.ee';

const mockS3Send = jest.fn();
const s3Client = mock<S3Client>({ send: mockS3Send });
jest.mock('@aws-sdk/client-s3', () => ({
	...jest.requireActual('@aws-sdk/client-s3'),
	S3Client: class {
		constructor() {
			return s3Client;
		}
	},
}));

describe('ObjectStoreService', () => {
	const mockBucket = { region: 'us-east-1', name: 'test-bucket' };
	const mockHost = `s3.${mockBucket.region}.amazonaws.com`;
	const FAILED_REQUEST_ERROR_MESSAGE = 'Request to S3 failed';
	const mockError = new Error('Something went wrong!');
	const workflowId = 'workflow-id';
	const executionId = 999;
	const binaryDataId = '71f6209b-5d48-41a2-a224-80d529d8bb32';
	const fileId = `workflows/${workflowId}/executions/${executionId}/binary_data/${binaryDataId}`;
	const mockBuffer = Buffer.from('Test data');
	const s3Config = mock<ObjectStoreConfig>({
		host: mockHost,
		bucket: mockBucket,
		credentials: {
			accessKey: 'mock-access-key',
			accessSecret: 'mock-secret-key',
			authAutoDetect: false,
		},
		protocol: 'https',
	});

	let objectStoreService: ObjectStoreService;

	const now = new Date('2024-02-01T01:23:45.678Z');
	jest.useFakeTimers({ now });

	beforeEach(async () => {
		objectStoreService = new ObjectStoreService(mock(), s3Config);
		await objectStoreService.init();
		jest.restoreAllMocks();
	});

	describe('getClientConfig()', () => {
		const credentials = {
			accessKeyId: s3Config.credentials.accessKey,
			secretAccessKey: s3Config.credentials.accessSecret,
		};

		it('should return client config with endpoint and forcePathStyle when custom host is provided', () => {
			s3Config.host = 'example.com';

			const clientConfig = objectStoreService.getClientConfig();

			expect(clientConfig).toEqual({
				endpoint: 'https://example.com',
				forcePathStyle: true,
				region: mockBucket.region,
				credentials,
			});
		});

		it('should return client config without endpoint when host is not provided', () => {
			s3Config.host = '';

			const clientConfig = objectStoreService.getClientConfig();

			expect(clientConfig).toEqual({
				region: mockBucket.region,
				credentials,
			});
		});

		it('should return client config without credentials when authAutoDetect is true', () => {
			s3Config.credentials.authAutoDetect = true;

			const clientConfig = objectStoreService.getClientConfig();

			expect(clientConfig).toEqual({
				region: mockBucket.region,
			});
		});
	});

	describe('checkConnection()', () => {
		it('should send a HEAD request to the correct bucket', async () => {
			mockS3Send.mockResolvedValueOnce({});

			objectStoreService.setReady(false);

			await objectStoreService.checkConnection();

			const commandCaptor = captor<HeadObjectCommand>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command).toBeInstanceOf(HeadBucketCommand);
			expect(command.input).toEqual({ Bucket: 'test-bucket' });
		});

		it('should throw an error on request failure', async () => {
			objectStoreService.setReady(false);

			mockS3Send.mockRejectedValueOnce(mockError);

			const promise = objectStoreService.checkConnection();

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('getMetadata()', () => {
		it('should send a HEAD request to the correct bucket and key', async () => {
			mockS3Send.mockResolvedValueOnce({
				ContentType: 'text/plain',
				ContentLength: 1024,
				ETag: '"abc123"',
				LastModified: new Date(),
				Metadata: { filename: 'test.txt' },
			});

			await objectStoreService.getMetadata(fileId);

			const commandCaptor = captor<HeadObjectCommand>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command).toBeInstanceOf(HeadObjectCommand);
			expect(command.input).toEqual({
				Bucket: 'test-bucket',
				Key: fileId,
			});
		});

		it('should throw an error on request failure', async () => {
			mockS3Send.mockRejectedValueOnce(mockError);

			const promise = objectStoreService.getMetadata(fileId);

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('put()', () => {
		it('should send a PUT request to upload an object', async () => {
			const metadata = { fileName: 'file.txt', mimeType: 'text/plain' };

			mockS3Send.mockResolvedValueOnce({});

			await objectStoreService.put(fileId, mockBuffer, metadata);

			const commandCaptor = captor<PutObjectCommand>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command).toBeInstanceOf(PutObjectCommand);
			expect(command.input).toEqual({
				Bucket: 'test-bucket',
				Key: fileId,
				Body: mockBuffer,
				ContentLength: mockBuffer.length,
				ContentMD5: 'yh6gLBC3w39CW5t92G1eEQ==',
				ContentType: 'text/plain',
				Metadata: { filename: 'file.txt' },
			});
		});

		it('should encode filename with non-ASCII characters in metadata', async () => {
			const metadata = {
				fileName: 'Order Form - Gunes Ekspres Havacılık A.Ş.',
				mimeType: 'text/plain',
			};

			mockS3Send.mockResolvedValueOnce({});

			await objectStoreService.put(fileId, mockBuffer, metadata);

			const commandCaptor = captor<PutObjectCommand>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command).toBeInstanceOf(PutObjectCommand);
			expect(command.input).toEqual({
				Bucket: 'test-bucket',
				Key: fileId,
				Body: mockBuffer,
				ContentLength: mockBuffer.length,
				ContentMD5: 'yh6gLBC3w39CW5t92G1eEQ==',
				ContentType: 'text/plain',
				Metadata: {
					filename: 'Order%20Form%20-%20Gunes%20Ekspres%20Havac%C4%B1l%C4%B1k%20A.%C5%9E.',
				},
			});
		});

		it('should throw an error on request failure', async () => {
			const metadata = { fileName: 'file.txt', mimeType: 'text/plain' };

			mockS3Send.mockRejectedValueOnce(mockError);

			const promise = objectStoreService.put(fileId, mockBuffer, metadata);

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('get()', () => {
		it('should send a GET request to download an object as a buffer', async () => {
			const fileId = 'file.txt';
			const body = Readable.from(mockBuffer);

			mockS3Send.mockResolvedValueOnce({ Body: body });

			const result = await objectStoreService.get(fileId, { mode: 'buffer' });

			const commandCaptor = captor<GetObjectCommand>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command).toBeInstanceOf(GetObjectCommand);
			expect(command.input).toEqual({
				Bucket: 'test-bucket',
				Key: fileId,
			});

			expect(Buffer.isBuffer(result)).toBe(true);
		});

		it('should send a GET request to download an object as a stream', async () => {
			const body = new Readable();

			mockS3Send.mockResolvedValueOnce({ Body: body });

			const result = await objectStoreService.get(fileId, { mode: 'stream' });

			const commandCaptor = captor<GetObjectCommand>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command).toBeInstanceOf(GetObjectCommand);
			expect(command.input).toEqual({
				Bucket: 'test-bucket',
				Key: fileId,
			});

			expect(result instanceof Readable).toBe(true);
			expect(result).toBe(body);
		});

		it('should throw an error on request failure', async () => {
			mockS3Send.mockRejectedValueOnce(mockError);

			const promise = objectStoreService.get(fileId, { mode: 'buffer' });

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('deleteOne()', () => {
		it('should send a DELETE request to delete a single object', async () => {
			mockS3Send.mockResolvedValueOnce({});

			await objectStoreService.deleteOne(fileId);

			const commandCaptor = captor<DeleteObjectCommand>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command).toBeInstanceOf(DeleteObjectCommand);
			expect(command.input).toEqual({
				Bucket: 'test-bucket',
				Key: fileId,
			});
		});

		it('should throw an error on request failure', async () => {
			mockS3Send.mockRejectedValueOnce(mockError);

			const promise = objectStoreService.deleteOne(fileId);

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('deleteMany()', () => {
		it('should send a DELETE request to delete multiple objects', async () => {
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
			mockS3Send.mockResolvedValueOnce({});

			await objectStoreService.deleteMany(prefix);

			const commandCaptor = captor<DeleteObjectsCommand>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command).toBeInstanceOf(DeleteObjectsCommand);
			expect(command.input).toEqual({
				Bucket: 'test-bucket',
				Delete: {
					Objects: [{ Key: fileName }],
				},
			});
		});

		it('should not send a deletion request if no prefix match', async () => {
			objectStoreService.list = jest.fn().mockResolvedValue([]);

			const result = await objectStoreService.deleteMany('non-matching-prefix');

			expect(result).toBeUndefined();
			expect(mockS3Send).not.toHaveBeenCalled();
		});

		it('should throw an error on request failure', async () => {
			objectStoreService.list = jest.fn().mockResolvedValue([{ key: 'file.txt' }]);
			mockS3Send.mockRejectedValueOnce(mockError);

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

			const result = await objectStoreService.list(prefix);

			expect(result).toEqual([...mockFirstListPage.contents, ...mockSecondListPage.contents]);
		});

		it('should throw an error on request failure', async () => {
			objectStoreService.getListPage = jest.fn().mockRejectedValueOnce(mockError);

			const promise = objectStoreService.list('test-dir/');

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});

	describe('getListPage()', () => {
		it('should fetch a page of objects with a common prefix', async () => {
			const prefix = 'test-dir/';
			const mockContents = [
				{
					Key: `${prefix}file1.txt`,
					LastModified: new Date(),
					ETag: '"abc123"',
					Size: 123,
					StorageClass: 'STANDARD',
				},
			];

			mockS3Send.mockResolvedValueOnce({
				Contents: mockContents,
				IsTruncated: false,
			});

			const result = await objectStoreService.getListPage(prefix);

			const commandCaptor = captor<ListObjectsV2Command>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command).toBeInstanceOf(ListObjectsV2Command);
			expect(command.input).toEqual({
				Bucket: 'test-bucket',
				Prefix: prefix,
			});

			expect(result.contents).toHaveLength(1);
			expect(result.isTruncated).toBe(false);
		});

		it('should use continuation token when provided', async () => {
			const prefix = 'test-dir/';
			const token = 'next-page-token';

			mockS3Send.mockResolvedValueOnce({
				Contents: [],
				IsTruncated: false,
			});

			await objectStoreService.getListPage(prefix, token);

			const commandCaptor = captor<ListObjectsV2Command>();
			expect(mockS3Send).toHaveBeenCalledWith(commandCaptor);
			const command = commandCaptor.value;
			expect(command.input).toEqual({
				Bucket: 'test-bucket',
				Prefix: prefix,
				ContinuationToken: token,
			});
		});

		it('should throw an error on request failure', async () => {
			mockS3Send.mockRejectedValueOnce(mockError);

			const promise = objectStoreService.getListPage('test-dir/');

			await expect(promise).rejects.toThrowError(FAILED_REQUEST_ERROR_MESSAGE);
		});
	});
});
