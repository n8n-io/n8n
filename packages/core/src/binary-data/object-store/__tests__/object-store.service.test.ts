import type { S3Config } from '@n8n/config';
import axios from 'axios';
import { mock } from 'jest-mock-extended';
import { Readable } from 'stream';

import { ObjectStoreService } from '@/binary-data/object-store/object-store.service.ee';
import { writeBlockedMessage } from '@/binary-data/object-store/utils';

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
const s3Config = mock<S3Config>({
	host: mockHost,
	bucket: mockBucket,
	credentials: mockCredentials,
	protocol: 'https',
});

const toDeletionXml = (filename: string) => `<Delete>
<Object><Key>${filename}</Key></Object>
</Delete>`;

let objectStoreService: ObjectStoreService;

const now = new Date('2024-02-01T01:23:45.678Z');
jest.useFakeTimers({ now });

beforeEach(async () => {
	objectStoreService = new ObjectStoreService(mock(), s3Config);
	mockAxios.request.mockResolvedValueOnce({ status: 200 }); // for checkConnection
	await objectStoreService.init();
	jest.restoreAllMocks();
});

describe('checkConnection()', () => {
	it('should send a HEAD request to the correct host', async () => {
		mockAxios.request.mockResolvedValue({ status: 200 });

		objectStoreService.setReady(false);

		await objectStoreService.checkConnection();

		expect(mockAxios.request).toHaveBeenCalledWith({
			method: 'HEAD',
			url: 'https://s3.us-east-1.amazonaws.com/test-bucket',
			headers: {
				Host: 's3.us-east-1.amazonaws.com',
				'X-Amz-Content-Sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'X-Amz-Date': '20240201T012345Z',
				Authorization:
					'AWS4-HMAC-SHA256 Credential=mock-access-key/20240201/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=a5240c11a706e9e6c60e7033a848fc934911b12330e5a4609b0b943f97d9781b',
			},
		});
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

		expect(mockAxios.request).toHaveBeenCalledWith({
			method: 'HEAD',
			url: `${mockUrl}/${fileId}`,
			headers: {
				Host: mockHost,
				'X-Amz-Content-Sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'X-Amz-Date': '20240201T012345Z',
				Authorization:
					'AWS4-HMAC-SHA256 Credential=mock-access-key/20240201/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=60e11c39580ad7dd3a3d549523e7115cdff018540f24c6412ed40053e52a21d0',
			},
		});
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

		expect(mockAxios.request).toHaveBeenCalledWith({
			method: 'PUT',
			url: 'https://s3.us-east-1.amazonaws.com/test-bucket/workflows/ObogjVbqpNOQpiyV/executions/999/binary_data/71f6209b-5d48-41a2-a224-80d529d8bb32',
			headers: {
				'Content-Length': 9,
				'Content-MD5': 'yh6gLBC3w39CW5t92G1eEQ==',
				'x-amz-meta-filename': 'file.txt',
				'Content-Type': 'text/plain',
				Host: 's3.us-east-1.amazonaws.com',
				'X-Amz-Content-Sha256': 'e27c8214be8b7cf5bccc7c08247e3cb0c1514a48ee1f63197fe4ef3ef51d7e6f',
				'X-Amz-Date': '20240201T012345Z',
				Authorization:
					'AWS4-HMAC-SHA256 Credential=mock-access-key/20240201/us-east-1/s3/aws4_request, SignedHeaders=content-length;content-md5;content-type;host;x-amz-content-sha256;x-amz-date;x-amz-meta-filename, Signature=6b0fbb51a35dbfa73ac79a964ffc7203b40517a062efc5b01f5f9b7ad553fa7a',
			},
			data: mockBuffer,
		});
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

		expect(mockAxios.request).toHaveBeenCalledWith({
			method: 'GET',
			url: `${mockUrl}/${fileId}`,
			responseType: 'arraybuffer',
			headers: {
				Authorization:
					'AWS4-HMAC-SHA256 Credential=mock-access-key/20240201/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=5f69680786e0ad9f0a0324eb5e4b8fe8c78562afc924489ea423632a2ad2187d',
				Host: 's3.us-east-1.amazonaws.com',
				'X-Amz-Content-Sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'X-Amz-Date': '20240201T012345Z',
			},
		});

		expect(Buffer.isBuffer(result)).toBe(true);
	});

	it('should send a GET request to download an object as a stream', async () => {
		mockAxios.request.mockResolvedValue({ status: 200, data: new Readable() });

		const result = await objectStoreService.get(fileId, { mode: 'stream' });

		expect(mockAxios.request).toHaveBeenCalledWith({
			method: 'GET',
			url: `${mockUrl}/${fileId}`,
			responseType: 'stream',
			headers: {
				Authorization:
					'AWS4-HMAC-SHA256 Credential=mock-access-key/20240201/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=3ef579ebe2ae89303a89c0faf3ce8ef8e907295dc538d59e95bcf35481c0d03e',
				Host: 's3.us-east-1.amazonaws.com',
				'X-Amz-Content-Sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'X-Amz-Date': '20240201T012345Z',
			},
		});

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

		expect(mockAxios.request).toHaveBeenCalledWith({
			method: 'DELETE',
			url: `${mockUrl}/${fileId}`,
			headers: {
				Authorization:
					'AWS4-HMAC-SHA256 Credential=mock-access-key/20240201/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=4ad61b1b4da335c6c49772d28e54a301f787d199c9403055b217f890f7aec7fc',
				Host: 's3.us-east-1.amazonaws.com',
				'X-Amz-Content-Sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'X-Amz-Date': '20240201T012345Z',
			},
		});
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

		expect(mockAxios.request).toHaveBeenCalledWith({
			method: 'POST',
			url: `${mockUrl}?delete=`,
			headers: {
				'Content-Type': 'application/xml',
				'Content-Length': 55,
				'Content-MD5': 'ybYDrpQxwYvNIGBQs7PJNA==',
				Host: 's3.us-east-1.amazonaws.com',
				'X-Amz-Content-Sha256': '5708e5c935cb75eb528e41ef1548e08b26c5b3b7504b67dc911abc1ff1881f76',
				'X-Amz-Date': '20240201T012345Z',
				Authorization:
					'AWS4-HMAC-SHA256 Credential=mock-access-key/20240201/us-east-1/s3/aws4_request, SignedHeaders=content-length;content-md5;content-type;host;x-amz-content-sha256;x-amz-date, Signature=039168f10927b31624f3a5edae8eb4c89405f7c594eb2d6e00257c1462363f99',
			},
			data: toDeletionXml(fileName),
		});
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
