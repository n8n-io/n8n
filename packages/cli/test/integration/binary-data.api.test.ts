import { mockInstance } from '@n8n/backend-test-utils';
import { BinaryDataService, FileNotFoundError } from 'n8n-core';
import fsp from 'node:fs/promises';
import { Readable } from 'node:stream';

import { createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import { setupTestServer } from './shared/utils';

jest.mock('fs/promises');

const throwFileNotFound = () => {
	throw new FileNotFoundError('non/existing/path');
};

const binaryDataService = mockInstance(BinaryDataService);
const testServer = setupTestServer({ endpointGroups: ['binaryData'] });
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	const owner = await createOwner();
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

	describe('should handle non-ASCII filename [filesystem]', () => {
		test('on request to download', async () => {
			const nonAsciiFileName = 'äöüß.png';

			const res = await authOwnerAgent
				.get('/binary-data')
				.query({
					id: fsBinaryDataId,
					fileName: nonAsciiFileName,
					mimeType,
					action: 'download',
				})
				.expect(200);

			expect(res.headers['content-disposition']).toBe(
				`attachment; filename="${encodeURIComponent(nonAsciiFileName)}"`,
			);
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
