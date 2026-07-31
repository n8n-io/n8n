import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { Request, Response } from 'express';
import * as fsPromises from 'fs/promises';
import { mock } from 'jest-mock-extended';
import multer from 'multer';

jest.mock('../data-table-size-validator.service', () => ({
	DataTableSizeValidator: class {},
}));
jest.mock('../data-table.repository', () => ({
	DataTableRepository: class {},
}));
jest.mock('fs/promises', () => ({
	mkdir: jest.fn().mockResolvedValue(undefined),
	readdir: jest.fn().mockResolvedValue([]),
	stat: jest.fn(),
	unlink: jest.fn().mockResolvedValue(undefined),
}));

// Controllable stub for multer().single() — each test sets its behaviour.
const multerSingleMiddleware = jest.fn();
jest.mock('multer', () => {
	class MulterError extends Error {}
	const multerMock = Object.assign(
		jest.fn(() => ({ single: () => multerSingleMiddleware })),
		{
			diskStorage: jest.fn(() => ({})),
			MulterError,
		},
	);
	return { __esModule: true, default: multerMock };
});

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { DataTableSizeValidator } from '../data-table-size-validator.service';
import type { DataTableRepository } from '../data-table.repository';
import { MulterUploadMiddleware } from '../multer-upload-middleware';
import type { AuthenticatedRequestWithFile } from '../types';

const fs = fsPromises as unknown as {
	readdir: jest.Mock;
	stat: jest.Mock;
	unlink: jest.Mock;
};

const UPLOAD_DIR = '/mock/n8n/dataTableUploads';
const MAX_SIZE = 50 * 1024 * 1024;

const buildMiddleware = (opts: { uploadMaxFileSize?: number } = {}) => {
	const globalConfig = {
		dataTable: {
			uploadDir: UPLOAD_DIR,
			maxSize: MAX_SIZE,
			uploadMaxFileSize: opts.uploadMaxFileSize,
		},
	} as GlobalConfig;

	const sizeValidator = mock<DataTableSizeValidator>();
	const dataTableRepository = mock<DataTableRepository>();
	const logger = mock<Logger>();

	const middleware = new MulterUploadMiddleware(
		globalConfig,
		sizeValidator,
		dataTableRepository,
		logger,
	);
	return { middleware, sizeValidator, dataTableRepository, logger };
};

const stubUploadDir = (files: Array<{ name: string; size: number }>) => {
	fs.readdir.mockResolvedValue(files.map((f) => f.name));
	fs.stat.mockImplementation(async (filePath: string) => {
		const name = filePath.split('/').pop();
		const found = files.find((f) => f.name === name);
		if (!found) {
			const err = new Error('ENOENT') as NodeJS.ErrnoException;
			err.code = 'ENOENT';
			throw err;
		}
		return { isFile: () => true, size: found.size };
	});
};

/**
 * Invokes the wrapped handler returned by `single()` and resolves when the
 * inner `next()` is called, mirroring how Express drives the middleware.
 */
const runHandler = async (
	middleware: MulterUploadMiddleware,
	reqInit: Partial<AuthenticatedRequestWithFile> = {},
): Promise<AuthenticatedRequestWithFile> => {
	const handler = middleware.single('file');
	const req = reqInit as AuthenticatedRequestWithFile & Request;
	const res = {} as Response;
	await new Promise<void>((resolve) => {
		void handler(req, res, () => resolve());
	});
	return req as AuthenticatedRequestWithFile;
};

describe('MulterUploadMiddleware', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		fs.readdir.mockResolvedValue([]);
		fs.unlink.mockResolvedValue(undefined);
	});

	describe('single() — post-stream quota enforcement', () => {
		const stubMulterSuccess = (filePath: string, size: number) => {
			multerSingleMiddleware.mockImplementation((req, _res, cb) => {
				(req as AuthenticatedRequestWithFile).file = {
					path: filePath,
					size,
				} as Express.Multer.File;
				cb(null);
			});
		};

		test('leaves the uploaded file in place when usage stays within quota', async () => {
			const { middleware, sizeValidator } = buildMiddleware();
			sizeValidator.getCachedSizeData.mockResolvedValue({ totalBytes: 1_000 } as never);
			const filePath = `${UPLOAD_DIR}/just-written`;
			stubUploadDir([{ name: 'just-written', size: 2_000 }]);
			stubMulterSuccess(filePath, 2_000);

			const req = await runHandler(middleware);

			expect(req.fileUploadError).toBeUndefined();
			expect(req.file).toBeDefined();
			expect(fs.unlink).not.toHaveBeenCalled();
		});

		test('unlinks the file and reports a BadRequestError when usage exceeds quota', async () => {
			const { middleware, sizeValidator } = buildMiddleware();
			sizeValidator.getCachedSizeData.mockResolvedValue({
				totalBytes: 40 * 1024 * 1024,
			} as never);
			const filePath = `${UPLOAD_DIR}/just-written`;
			stubUploadDir([{ name: 'just-written', size: 20 * 1024 * 1024 }]);
			stubMulterSuccess(filePath, 20 * 1024 * 1024);

			const req = await runHandler(middleware);

			expect(req.fileUploadError).toBeInstanceOf(BadRequestError);
			expect(fs.unlink).toHaveBeenCalledWith(filePath);
		});

		test('still reports BadRequestError and logs when unlink fails (best-effort cleanup)', async () => {
			const { middleware, sizeValidator, logger } = buildMiddleware();
			sizeValidator.getCachedSizeData.mockResolvedValue({
				totalBytes: 60 * 1024 * 1024,
			} as never);
			const filePath = `${UPLOAD_DIR}/just-written`;
			stubUploadDir([{ name: 'just-written', size: 1 }]);
			stubMulterSuccess(filePath, 1);
			fs.unlink.mockRejectedValue(new Error('EBUSY'));

			const req = await runHandler(middleware);

			expect(req.fileUploadError).toBeInstanceOf(BadRequestError);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Failed to remove data-table upload'),
				expect.objectContaining({ path: filePath }),
			);
		});

		test('runs the post-stream check even when an explicit per-file cap is configured', async () => {
			// multer's per-file limit doesn't protect against orphan accumulation.
			const { middleware, sizeValidator } = buildMiddleware({
				uploadMaxFileSize: 1024,
			});
			sizeValidator.getCachedSizeData.mockResolvedValue({
				totalBytes: MAX_SIZE,
			} as never);
			const filePath = `${UPLOAD_DIR}/just-written`;
			stubUploadDir([{ name: 'just-written', size: 1 }]);
			stubMulterSuccess(filePath, 1);

			const req = await runHandler(middleware);

			expect(req.fileUploadError).toBeInstanceOf(BadRequestError);
			expect(fs.unlink).toHaveBeenCalledWith(filePath);
		});

		test('logs and skips individual files that disappear during size accounting', async () => {
			const { middleware, sizeValidator, logger } = buildMiddleware();
			sizeValidator.getCachedSizeData.mockResolvedValue({ totalBytes: 0 } as never);
			fs.readdir.mockResolvedValue(['ghost', 'just-written']);
			fs.stat.mockImplementation(async (filePath: string) => {
				if (filePath.endsWith('ghost')) {
					const err = new Error('ENOENT') as NodeJS.ErrnoException;
					err.code = 'ENOENT';
					throw err;
				}
				return { isFile: () => true, size: 100 };
			});
			stubMulterSuccess(`${UPLOAD_DIR}/just-written`, 100);

			const req = await runHandler(middleware);

			expect(req.fileUploadError).toBeUndefined();
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Failed to stat data-table upload file'),
				expect.objectContaining({ file: 'ghost' }),
			);
		});

		test('fails closed when the temp dir cannot be read (quota cannot be verified)', async () => {
			const { middleware, sizeValidator, logger } = buildMiddleware();
			sizeValidator.getCachedSizeData.mockResolvedValue({ totalBytes: 0 } as never);
			fs.readdir.mockRejectedValue(new Error('EACCES'));
			const filePath = `${UPLOAD_DIR}/just-written`;
			stubMulterSuccess(filePath, 100);

			const req = await runHandler(middleware);

			expect(req.fileUploadError).toBeInstanceOf(BadRequestError);
			expect(fs.unlink).toHaveBeenCalledWith(filePath);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Failed to validate data-table storage budget'),
				expect.objectContaining({ path: filePath }),
			);
		});

		test('fails closed when persisted size lookup fails', async () => {
			const { middleware, sizeValidator } = buildMiddleware();
			sizeValidator.getCachedSizeData.mockRejectedValue(new Error('db down'));
			const filePath = `${UPLOAD_DIR}/just-written`;
			stubMulterSuccess(filePath, 100);

			const req = await runHandler(middleware);

			expect(req.fileUploadError).toBeInstanceOf(BadRequestError);
			expect(fs.unlink).toHaveBeenCalledWith(filePath);
		});

		test('serializes concurrent quota checks so they observe consistent temp dir state', async () => {
			const { middleware, sizeValidator } = buildMiddleware();
			sizeValidator.getCachedSizeData.mockResolvedValue({
				totalBytes: 30 * 1024 * 1024,
			} as never);

			const present = new Set<string>();
			fs.readdir.mockImplementation(async () => Array.from(present));
			fs.stat.mockImplementation(async () => ({
				isFile: () => true,
				size: 15 * 1024 * 1024,
			}));
			fs.unlink.mockImplementation(async (target: string) => {
				present.delete(target.split('/').pop()!);
			});

			let callIndex = 0;
			multerSingleMiddleware.mockImplementation((req, _res, cb) => {
				const name = callIndex++ === 0 ? 'upload-a' : 'upload-b';
				present.add(name);
				(req as AuthenticatedRequestWithFile).file = {
					path: `${UPLOAD_DIR}/${name}`,
					size: 15 * 1024 * 1024,
				} as Express.Multer.File;
				cb(null);
			});

			const [first, second] = await Promise.all([runHandler(middleware), runHandler(middleware)]);

			// First check sees both files (over quota) and unlinks itself.
			// Second check then sees only its own bytes left and passes.
			expect(first.fileUploadError).toBeInstanceOf(BadRequestError);
			expect(second.fileUploadError).toBeUndefined();
			expect(fs.unlink).toHaveBeenCalledWith(`${UPLOAD_DIR}/upload-a`);
			expect(fs.unlink).not.toHaveBeenCalledWith(`${UPLOAD_DIR}/upload-b`);
		});

		test('forwards multer errors without running the quota check', async () => {
			const { middleware, sizeValidator } = buildMiddleware();
			const multerErr = new multer.MulterError('LIMIT_FILE_SIZE');
			multerSingleMiddleware.mockImplementation((_req, _res, cb) => {
				cb(multerErr);
			});

			const req = await runHandler(middleware);

			expect(req.fileUploadError).toBe(multerErr);
			expect(sizeValidator.getCachedSizeData).not.toHaveBeenCalled();
			expect(fs.unlink).not.toHaveBeenCalled();
		});
	});
});
