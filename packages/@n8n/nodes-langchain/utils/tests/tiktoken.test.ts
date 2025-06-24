/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { TiktokenEncoding } from 'js-tiktoken/lite';
import { Tiktoken } from 'js-tiktoken/lite';

import { getEncoding, encodingForModel } from '../tokenizer/tiktoken';

jest.mock('js-tiktoken/lite', () => ({
	Tiktoken: jest.fn(),
	getEncodingNameForModel: jest.fn(),
}));

jest.mock('../tokenizer/cl100k_base.json', () => ({ mockCl100kBase: 'data' }), { virtual: true });
jest.mock('../tokenizer/o200k_base.json', () => ({ mockO200kBase: 'data' }), { virtual: true });

describe('tiktoken utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getEncoding', () => {
		it('should return Tiktoken instance for cl100k_base encoding', async () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = await getEncoding('cl100k_base');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should return Tiktoken instance for o200k_base encoding', async () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = await getEncoding('o200k_base');

			expect(Tiktoken).toHaveBeenCalledWith({ mockO200kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should map p50k_base to cl100k_base encoding', async () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = await getEncoding('p50k_base');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should map r50k_base to cl100k_base encoding', async () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = await getEncoding('r50k_base');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should map gpt2 to cl100k_base encoding', async () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = await getEncoding('gpt2');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should map p50k_edit to cl100k_base encoding', async () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = await getEncoding('p50k_edit');

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should return cl100k_base for unknown encoding', async () => {
			const mockTiktoken = {};
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			const result = await getEncoding('unknown_encoding' as unknown as TiktokenEncoding);

			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});
	});

	describe('encodingForModel', () => {
		it('should call getEncodingNameForModel and return encoding for cl100k_base', async () => {
			const mockGetEncodingNameForModel = require('js-tiktoken/lite').getEncodingNameForModel;
			const mockTiktoken = {};

			mockGetEncodingNameForModel.mockReturnValue('cl100k_base');
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = await encodingForModel('gpt-3.5-turbo');

			expect(mockGetEncodingNameForModel).toHaveBeenCalledWith('gpt-3.5-turbo');
			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});

		it('should handle gpt-4 model with cl100k_base', async () => {
			const mockGetEncodingNameForModel = require('js-tiktoken/lite').getEncodingNameForModel;
			const mockTiktoken = {};

			mockGetEncodingNameForModel.mockReturnValue('cl100k_base');
			(Tiktoken as unknown as jest.Mock).mockReturnValue(mockTiktoken);

			const result = await encodingForModel('gpt-4');

			expect(mockGetEncodingNameForModel).toHaveBeenCalledWith('gpt-4');
			expect(Tiktoken).toHaveBeenCalledWith({ mockCl100kBase: 'data' });
			expect(result).toBe(mockTiktoken);
		});
	});
});
