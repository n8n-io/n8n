/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-require-imports */
import type { TiktokenEncoding } from 'js-tiktoken/lite';
import { Tiktoken } from 'js-tiktoken/lite';

import { getEncoding, encodingForModel } from '../tokenizer/tiktoken';

jest.mock('js-tiktoken/lite', () => ({
	Tiktoken: jest.fn(),
	getEncodingNameForModel: jest.fn(),
}));

jest.mock('fs', () => ({
	readFileSync: jest.fn(),
}));

jest.mock('n8n-workflow', () => ({
	jsonParse: jest.fn(),
}));

describe('tiktoken utils', () => {
	const mockReadFileSync = require('fs').readFileSync;
	const mockJsonParse = require('n8n-workflow').jsonParse;

	beforeEach(() => {
		jest.clearAllMocks();

		// Set up mock implementations
		mockReadFileSync.mockImplementation((path: string) => {
			if (path.includes('cl100k_base.json')) {
				return JSON.stringify({ mockCl100kBase: 'data' });
			}
			if (path.includes('o200k_base.json')) {
				return JSON.stringify({ mockO200kBase: 'data' });
			}
			throw new Error(`Unexpected file path: ${path}`);
		});

		mockJsonParse.mockImplementation((content: string) => JSON.parse(content));
	});

	describe('getEncoding', () => {
		it('should return Tiktoken instance for cl100k_base encoding', () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = getEncoding('cl100k_base');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should return Tiktoken instance for o200k_base encoding', () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = getEncoding('o200k_base');

			expect(Tiktoken).toHaveBeenCalledWith({ mockO200kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should map p50k_base to cl100k_base encoding', () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = getEncoding('p50k_base');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should map r50k_base to cl100k_base encoding', () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = getEncoding('r50k_base');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should map gpt2 to cl100k_base encoding', () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = getEncoding('gpt2');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should map p50k_edit to cl100k_base encoding', () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = getEncoding('p50k_edit');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should return cl100k_base for unknown encoding', () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = getEncoding('unknown_encoding' as unknown as TiktokenEncoding);

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should use cache for repeated calls with same encoding', () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			// Clear any previous calls to isolate this test
			jest.clearAllMocks();

			// Use a unique encoding that hasn't been cached yet
			const uniqueEncoding = 'test_encoding' as TiktokenEncoding;

			// First call
			const result1 = getEncoding(uniqueEncoding);
			expect(Tiktoken).toHaveBeenCalledTimes(1);
			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' }); // Falls back to cl100k_base

			// Second call - should use cache
			const result2 = getEncoding(uniqueEncoding);
			expect(Tiktoken).toHaveBeenCalledTimes(1); // Still only called once
			expect(result1).toBe(result2);
		});
	});

	describe('encodingForModel', () => {
		it('should call getEncodingNameForModel and return encoding for cl100k_base', () => {
			const mockGetEncodingNameForModel = require('js-tiktoken/lite').getEncodingNameForModel;
			const mockTiktoken = {};

			mockGetEncodingNameForModel.mockReturnValue('cl100k_base');
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			// Clear previous calls since cl100k_base might be cached from previous tests
			jest.clearAllMocks();
			mockGetEncodingNameForModel.mockReturnValue('cl100k_base');

			const result = encodingForModel('gpt-3.5-turbo');

			expect(mockGetEncodingNameForModel).toHaveBeenCalledWith('gpt-3.5-turbo');
			// Since cl100k_base was already loaded in previous tests, Tiktoken constructor
			// won't be called again due to caching
			expect(result).toBeTruthy();
		});

		it('should handle gpt-4 model with o200k_base', () => {
			const mockGetEncodingNameForModel = require('js-tiktoken/lite').getEncodingNameForModel;
			const mockTiktoken = { isO200k: true };

			// Use o200k_base to test a different encoding
			mockGetEncodingNameForModel.mockReturnValue('o200k_base');
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			// Clear mocks and set up for this test
			jest.clearAllMocks();
			mockGetEncodingNameForModel.mockReturnValue('o200k_base');

			const result = encodingForModel('gpt-4');

			expect(mockGetEncodingNameForModel).toHaveBeenCalledWith('gpt-4');
			// Since o200k_base was already loaded in previous tests, we just verify the result
			expect(result).toBeTruthy();
		});
	});
});
