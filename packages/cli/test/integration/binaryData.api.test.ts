import fsp from 'node:fs/promises';
import { Readable } from 'node:stream';
import { BinaryDataService, FileNotFoundError } from 'n8n-core';
import * as testDb from './shared/testDb';
import { mockInstance, setupTestServer } from './shared/utils';
import type { SuperAgentTest } from 'supertest';

jest.mock('fs/promises');

const throwFileNotFound = () => {
	throw new FileNotFoundError('non/existing/path');
};

const binaryDataService = mockInstance(BinaryDataService);
let testServer = setupTestServer({ endpointGroups: ['binaryData'] });
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	const owner = await testDb.createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('GET /binary-data', () => {
	const fileId = '599c5f84007-7d14-4b63-8f1e-d726098d0cc0';
	const fsBinaryDataId = `filesystem:${fileId}`;
	const s3BinaryDataId = `s3:${fileId}`;
	const binaryFilePath = `/Users/john/.n8n/binaryData/${fileId}`;
	const mimeType = 'text/plain';
	const fileName = 'test.txt';
	const buffer = Buffer.from('content');
	const mockStream = new Readable();
	mockStream.push(buffer);
	mockStream.push(null);

	describe('should reject on missing or invalid binary data ID', () => {
		test.each([['view'], ['download']])('on request to %s', async (action) => {
			binaryDataService.getPath.mockReturnValue(binaryFilePath);
			fsp.readFile = jest.fn().mockResolvedValue(buffer);

			await authOwnerAgent
				.get('/binary-data')
				.query({
					fileName,
					mimeType,
					action,
				})
				.expect(400);

			await authOwnerAgent
				.get('/binary-data')
				.query({
					id: 'invalid',
					fileName,
					mimeType,
					action,
				})
				.expect(400);
		});
	});

	describe('should return binary data [filesystem]', () => {
		test.each([['view'], ['download']])('on request to %s', async (action) => {
			binaryDataService.getAsStream.mockResolvedValue(mockStream);

			const res = await authOwnerAgent
				.get('/binary-data')
				.query({
					id: fsBinaryDataId,
					fileName,
					mimeType,
					action,
				})
				.expect(200);

			const contentDisposition =
				action === 'download' ? `attachment; filename="${fileName}"` : undefined;

			expect(binaryDataService.getAsStream).toHaveBeenCalledWith(fsBinaryDataId);
			expect(res.headers['content-type']).toBe(mimeType);
			expect(res.headers['content-disposition']).toBe(contentDisposition);
		});
	});

	describe('should return 404 on file not found [filesystem]', () => {
		test.each(['view', 'download'])('on request to %s', async (action) => {
			binaryDataService.getAsStream.mockImplementation(throwFileNotFound);

			await authOwnerAgent
				.get('/binary-data')
				.query({
					id: fsBinaryDataId,
					fileName,
					mimeType,
					action,
				})
				.expect(404);
		});
	});

	describe('should return binary data [s3]', () => {
		test.each([['view'], ['download']])('on request to %s', async (action) => {
			binaryDataService.getAsStream.mockResolvedValue(mockStream);

			const res = await authOwnerAgent
				.get('/binary-data')
				.query({
					id: s3BinaryDataId,
					fileName,
					mimeType,
					action,
				})
				.expect(200);

			expect(binaryDataService.getAsStream).toHaveBeenCalledWith(s3BinaryDataId);

			const contentDisposition =
				action === 'download' ? `attachment; filename="${fileName}"` : undefined;

			expect(res.headers['content-type']).toBe(mimeType);
			expect(res.headers['content-disposition']).toBe(contentDisposition);
		});
	});

	describe('should return 404 on file not found [s3]', () => {
		test.each(['view', 'download'])('on request to %s', async (action) => {
			binaryDataService.getAsStream.mockImplementation(throwFileNotFound);

			await authOwnerAgent
				.get('/binary-data')
				.query({
					id: s3BinaryDataId,
					fileName,
					mimeType,
					action,
				})
				.expect(404);
		});
	});
});
