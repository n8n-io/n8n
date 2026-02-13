import { mock } from 'jest-mock-extended';
import type { IBinaryData } from 'n8n-workflow';
import type { BinaryDataService } from 'n8n-core';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { FileUploadController } from '../file-upload.controller';
import type { AuthenticatedRequestWithFile } from '../types';

// Prevent Container.get and @Service/@RestController/@Post decorators from running
jest.mock('@n8n/di', () => ({
	Container: { get: jest.fn().mockReturnValue({ single: jest.fn() }) },
	Service: () => (target: unknown) => target,
}));
jest.mock('@n8n/decorators', () => ({
	RestController: () => (target: unknown) => target,
	Post: () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

// Mock n8n-core to avoid deep import chain
jest.mock('n8n-core', () => ({
	BinaryDataService: jest.fn(),
}));

jest.mock('fs', () => ({
	createReadStream: jest.fn().mockReturnValue('mock-stream'),
}));

const mockUnlink = jest.fn().mockResolvedValue(undefined);
jest.mock('fs/promises', () => ({
	unlink: (...args: unknown[]) => mockUnlink(...args),
}));

describe('FileUploadController', () => {
	const binaryDataService = mock<BinaryDataService>();
	const controller = new FileUploadController(binaryDataService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should upload file and return file metadata', async () => {
		const req = mock<AuthenticatedRequestWithFile>({
			file: {
				path: '/tmp/upload-123',
				originalname: 'document.pdf',
				mimetype: 'application/pdf',
			},
			fileUploadError: undefined,
		});

		const storedBinaryData: IBinaryData = {
			id: 'binary:stored-id',
			data: 'filesystem',
			mimeType: 'application/pdf',
			fileName: 'document.pdf',
			fileSize: '1.5 kB',
			bytes: 1500,
		};
		binaryDataService.store.mockResolvedValue(storedBinaryData);

		const result = await controller.uploadFile(req);

		expect(result).toEqual({
			fileId: 'binary:stored-id',
			fileName: 'document.pdf',
			mimeType: 'application/pdf',
			fileSize: 1500,
		});
		expect(binaryDataService.store).toHaveBeenCalledWith(
			{ type: 'custom', pathSegments: ['file-uploads'] },
			'mock-stream',
			expect.objectContaining({ fileName: 'document.pdf', mimeType: 'application/pdf' }),
		);
	});

	it('should throw BadRequestError when no file is uploaded', async () => {
		const req = mock<AuthenticatedRequestWithFile>({
			file: undefined,
			fileUploadError: undefined,
		});

		await expect(controller.uploadFile(req)).rejects.toThrow(BadRequestError);
		await expect(controller.uploadFile(req)).rejects.toThrow('No file uploaded');
	});

	it('should throw BadRequestError on MulterError', async () => {
		const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
		const req = mock<AuthenticatedRequestWithFile>({
			file: undefined,
			fileUploadError: multerError,
		});

		await expect(controller.uploadFile(req)).rejects.toThrow(BadRequestError);
		await expect(controller.uploadFile(req)).rejects.toThrow('File upload error:');
	});

	it('should rethrow BadRequestError from fileUploadError', async () => {
		const badReqError = new BadRequestError('Custom validation failed');
		const req = mock<AuthenticatedRequestWithFile>({
			file: undefined,
			fileUploadError: badReqError,
		});

		await expect(controller.uploadFile(req)).rejects.toThrow(badReqError);
	});

	it('should throw generic BadRequestError for unknown upload errors', async () => {
		const req = mock<AuthenticatedRequestWithFile>({
			file: undefined,
			fileUploadError: new Error('something unexpected'),
		});

		await expect(controller.uploadFile(req)).rejects.toThrow('File upload failed');
	});

	it('should clean up temp file after successful upload', async () => {
		const req = mock<AuthenticatedRequestWithFile>({
			file: {
				path: '/tmp/upload-cleanup',
				originalname: 'file.txt',
				mimetype: 'text/plain',
			},
			fileUploadError: undefined,
		});

		binaryDataService.store.mockResolvedValue(mock<IBinaryData>({ id: 'binary:id', bytes: 100 }));

		await controller.uploadFile(req);

		expect(mockUnlink).toHaveBeenCalledWith('/tmp/upload-cleanup');
	});

	it('should clean up temp file even when store throws', async () => {
		const req = mock<AuthenticatedRequestWithFile>({
			file: {
				path: '/tmp/upload-fail',
				originalname: 'file.txt',
				mimetype: 'text/plain',
			},
			fileUploadError: undefined,
		});

		binaryDataService.store.mockRejectedValue(new Error('Store failed'));

		await expect(controller.uploadFile(req)).rejects.toThrow('Store failed');
		expect(mockUnlink).toHaveBeenCalledWith('/tmp/upload-fail');
	});
});
