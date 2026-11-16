import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import multer from 'multer';
import { mock } from 'vitest-mock-extended';

import { KnowledgeConfig } from '../../knowledge.config';
import { KnowledgeUploadError } from '../knowledge-upload.error';
import { isAllowedKnowledgeFile, KnowledgeUploadMiddleware } from '../knowledge-upload.middleware';

const { multerFactoryMock, uploadArrayMock } = vi.hoisted(() => ({
	multerFactoryMock: vi.fn(),
	uploadArrayMock: vi.fn(),
}));

// Keep the real `MulterError` and `diskStorage`; only the factory is observed,
// so the tests can check which limits the middleware hands to multer.
vi.mock('multer', async (importOriginal) => {
	const actual = await importOriginal<{ default: typeof multer }>();
	const factory = Object.assign(
		(...args: unknown[]) => {
			multerFactoryMock(...args);
			return { array: uploadArrayMock };
		},
		{ diskStorage: actual.default.diskStorage, MulterError: actual.default.MulterError },
	);
	return { default: factory };
});

describe('KnowledgeUploadMiddleware', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		uploadArrayMock.mockReturnValue(
			(_req: Request, _res: Response, done: (error?: unknown) => void) => done(),
		);
	});

	it('limits the file size to the configured value', () => {
		new KnowledgeUploadMiddleware(
			mock<KnowledgeConfig>({ maxFileSizeBytes: 5 * 1024 * 1024, maxFilesPerUpload: 3 }),
		);

		expect(multerFactoryMock).toHaveBeenCalledWith(
			expect.objectContaining({ limits: { fileSize: 5 * 1024 * 1024 } }),
		);
	});

	it('limits the file count per upload to the configured value', () => {
		const middleware = new KnowledgeUploadMiddleware(
			mock<KnowledgeConfig>({ maxFileSizeBytes: 5 * 1024 * 1024, maxFilesPerUpload: 3 }),
		);

		void middleware.array('files')(mock<Request>(), mock<Response>(), vi.fn());

		expect(uploadArrayMock).toHaveBeenCalledWith('files', 3);
	});

	it('records a multer error on the request and still continues the chain', () => {
		const error = new multer.MulterError('LIMIT_FILE_SIZE', 'files');
		uploadArrayMock.mockReturnValue(
			(_req: Request, _res: Response, done: (error?: unknown) => void) => done(error),
		);
		const middleware = new KnowledgeUploadMiddleware(Container.get(KnowledgeConfig));
		const req = mock<Request & { fileUploadError?: Error }>();
		const next = vi.fn();

		void middleware.array('files')(req, mock<Response>(), next);

		expect(req.fileUploadError).toBe(error);
		expect(next).toHaveBeenCalledTimes(1);
	});

	describe('file filter', () => {
		function fileFilter() {
			new KnowledgeUploadMiddleware(Container.get(KnowledgeConfig));
			const [options] = multerFactoryMock.mock.calls[0] as [multer.Options];

			return options.fileFilter!;
		}

		it('accepts an allowed file', () => {
			const done = vi.fn();

			fileFilter()(mock<Request>(), mock<Express.Multer.File>({ originalname: 'notes.txt' }), done);

			expect(done).toHaveBeenCalledWith(null, true);
		});

		it('rejects a disallowed file with the file_type reason', () => {
			const done = vi.fn();

			fileFilter()(mock<Request>(), mock<Express.Multer.File>({ originalname: 'tool.exe' }), done);

			expect(done).toHaveBeenCalledWith(expect.any(KnowledgeUploadError));
			expect(done.mock.calls[0][0]).toMatchObject({
				message: 'Only CSV, PDF, Markdown, and TXT files are allowed',
				reason: 'file_type',
			});
		});
	});

	it.each(['data.csv', 'notes.md', 'notes.markdown', 'document.pdf', 'plain.txt'])(
		'allows %s',
		(originalname) => {
			expect(isAllowedKnowledgeFile({ originalname })).toBe(true);
		},
	);

	it.each(['archive.zip', 'image.png', 'script.js', 'document.pdf.exe', 'README'])(
		'rejects %s',
		(originalname) => {
			expect(isAllowedKnowledgeFile({ originalname })).toBe(false);
		},
	);
});

describe('describeMulterError', () => {
	beforeEach(() => {
		Container.reset();
	});

	describe('with the default limits', () => {
		const middleware = () => new KnowledgeUploadMiddleware(Container.get(KnowledgeConfig));

		it('explains the per-upload file count limit instead of surfacing "Unexpected field"', () => {
			const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'files');

			expect(middleware().describeMulterError(error)).toBe(
				'You can upload at most 10 files at a time',
			);
		});

		it('explains the file size limit', () => {
			const error = new multer.MulterError('LIMIT_FILE_SIZE', 'files');

			expect(middleware().describeMulterError(error)).toBe('Files must be 25 MB or smaller');
		});

		it('falls back to the multer message for other error codes', () => {
			const error = new multer.MulterError('LIMIT_FILE_COUNT', 'files');

			expect(middleware().describeMulterError(error)).toBe(error.message);
		});
	});

	describe('with configured limits', () => {
		const middleware = () =>
			new KnowledgeUploadMiddleware(
				mock<KnowledgeConfig>({ maxFileSizeMb: 5, maxFilesPerUpload: 3 }),
			);

		it('states the configured file count limit', () => {
			const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'files');

			expect(middleware().describeMulterError(error)).toBe(
				'You can upload at most 3 files at a time',
			);
		});

		it('states the configured file size limit', () => {
			const error = new multer.MulterError('LIMIT_FILE_SIZE', 'files');

			expect(middleware().describeMulterError(error)).toBe('Files must be 5 MB or smaller');
		});
	});
});
