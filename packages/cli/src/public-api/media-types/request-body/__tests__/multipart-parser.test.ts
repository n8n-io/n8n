const anyFieldMiddleware = vi.fn();
const multerFactory = vi.fn(() => ({ ['any']: () => anyFieldMiddleware }));

vi.mock('multer', () => {
	const multerMock = Object.assign(multerFactory, {
		memoryStorage: vi.fn(() => 'memory-storage'),
		MulterError: class MulterError extends Error {},
	});
	return { __esModule: true, default: multerMock };
});

import { loadMultipartParser } from '../multipart-parser';

describe('loadMultipartParser', () => {
	beforeEach(() => {
		multerFactory.mockClear();
	});

	it('builds multer with memory storage, every field accepted, and the given limits', async () => {
		const limits = { fileSize: 1024, files: 1 };

		const parser = await loadMultipartParser(limits);

		expect(multerFactory).toHaveBeenCalledWith({ storage: 'memory-storage', limits });
		expect(parser).toBe(anyFieldMiddleware);
	});
});
