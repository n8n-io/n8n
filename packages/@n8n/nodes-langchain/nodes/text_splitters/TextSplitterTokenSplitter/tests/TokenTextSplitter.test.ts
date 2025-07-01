import { OperationalError } from 'n8n-workflow';

import * as helpers from '../../../../utils/helpers';
import * as tiktokenUtils from '../../../../utils/tokenizer/tiktoken';
import * as tokenEstimator from '../../../../utils/tokenizer/token-estimator';
import { TokenTextSplitter } from '../TokenTextSplitter';

jest.mock('../../../../utils/tokenizer/tiktoken');
jest.mock('../../../../utils/helpers');
jest.mock('../../../../utils/tokenizer/token-estimator');

describe('TokenTextSplitter', () => {
	let mockTokenizer: jest.Mocked<{
		encode: jest.Mock;
		decode: jest.Mock;
	}>;

	beforeEach(() => {
		mockTokenizer = {
			encode: jest.fn(),
			decode: jest.fn(),
		};
		(tiktokenUtils.getEncoding as jest.Mock).mockResolvedValue(mockTokenizer);
		// Default mock for hasLongSequentialRepeat - no repetition
		(helpers.hasLongSequentialRepeat as jest.Mock).mockReturnValue(false);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should initialize with default parameters', () => {
			const splitter = new TokenTextSplitter();

			expect(splitter.encodingName).toBe('cl100k_base');
			expect(splitter.allowedSpecial).toEqual([]);
			expect(splitter.disallowedSpecial).toBe('all');
		});

		it('should initialize with custom parameters', () => {
			const splitter = new TokenTextSplitter({
				encodingName: 'o200k_base',
				allowedSpecial: ['<|special|>'],
				disallowedSpecial: ['<|bad|>'],
				chunkSize: 500,
				chunkOverlap: 50,
			});

			expect(splitter.encodingName).toBe('o200k_base');
			expect(splitter.allowedSpecial).toEqual(['<|special|>']);
			expect(splitter.disallowedSpecial).toEqual(['<|bad|>']);
			expect(splitter.chunkSize).toBe(500);
			expect(splitter.chunkOverlap).toBe(50);
		});

		it('should have correct lc_name', () => {
			expect(TokenTextSplitter.lc_name()).toBe('TokenTextSplitter');
		});
	});

	describe('splitText', () => {
		it('should split text into chunks based on token count', async () => {
			const splitter = new TokenTextSplitter({
				chunkSize: 3,
				chunkOverlap: 0,
			});

			const inputText = 'Hello world, this is a test';
			const mockTokenIds = [1, 2, 3, 4, 5, 6, 7, 8];

			mockTokenizer.encode.mockReturnValue(mockTokenIds);
			mockTokenizer.decode.mockImplementation((tokens: number[]) => {
				const chunks = [
					[1, 2, 3],
					[4, 5, 6],
					[7, 8],
				];
				const chunkTexts = ['Hello world,', ' this is', ' a test'];
				const index = chunks.findIndex(
					(chunk) => chunk.length === tokens.length && chunk.every((val, i) => val === tokens[i]),
				);
				return chunkTexts[index] || '';
			});

			const result = await splitter.splitText(inputText);

			expect(tiktokenUtils.getEncoding).toHaveBeenCalledWith('cl100k_base');
			expect(mockTokenizer.encode).toHaveBeenCalledWith(inputText, [], 'all');
			expect(result).toEqual(['Hello world,', ' this is', ' a test']);
		});

		it('should handle empty text', async () => {
			const splitter = new TokenTextSplitter();
			mockTokenizer.encode.mockReturnValue([]);

			const result = await splitter.splitText('');

			expect(result).toEqual([]);
		});

		it('should handle text shorter than chunk size', async () => {
			const splitter = new TokenTextSplitter({
				chunkSize: 10,
				chunkOverlap: 0,
			});

			const inputText = 'Short text';
			const mockTokenIds = [1, 2];

			mockTokenizer.encode.mockReturnValue(mockTokenIds);
			mockTokenizer.decode.mockReturnValue('Short text');

			const result = await splitter.splitText(inputText);

			expect(result).toEqual(['Short text']);
		});

		it('should use custom encoding and special tokens', async () => {
			const splitter = new TokenTextSplitter({
				encodingName: 'o200k_base',
				allowedSpecial: ['<|special|>'],
				disallowedSpecial: ['<|bad|>'],
			});

			const inputText = 'Text with <|special|> tokens';
			mockTokenizer.encode.mockReturnValue([1, 2, 3]);
			mockTokenizer.decode.mockReturnValue('Text with <|special|> tokens');

			await splitter.splitText(inputText);

			expect(tiktokenUtils.getEncoding).toHaveBeenCalledWith('o200k_base');
			expect(mockTokenizer.encode).toHaveBeenCalledWith(inputText, ['<|special|>'], ['<|bad|>']);
		});

		it('should reuse tokenizer on subsequent calls', async () => {
			const splitter = new TokenTextSplitter();
			mockTokenizer.encode.mockReturnValue([1, 2, 3]);
			mockTokenizer.decode.mockReturnValue('test');

			await splitter.splitText('first call');
			await splitter.splitText('second call');

			expect(tiktokenUtils.getEncoding).toHaveBeenCalledTimes(1);
		});

		it('should handle large text with multiple chunks and overlap', async () => {
			const splitter = new TokenTextSplitter({
				chunkSize: 2,
				chunkOverlap: 1,
			});

			const inputText = 'One two three four five six';
			const mockTokenIds = [1, 2, 3, 4, 5, 6];

			mockTokenizer.encode.mockReturnValue(mockTokenIds);
			mockTokenizer.decode.mockImplementation((tokens: number[]) => {
				const chunkMap: Record<string, string> = {
					'1,2': 'One two',
					'2,3': 'two three',
					'3,4': 'three four',
					'4,5': 'four five',
					'5,6': 'five six',
				};
				return chunkMap[tokens.join(',')] || '';
			});

			const result = await splitter.splitText(inputText);

			expect(result).toEqual(['One two', 'two three', 'three four', 'four five', 'five six']);
		});

		describe('repetitive content handling', () => {
			it('should use character-based estimation for repetitive content', async () => {
				const splitter = new TokenTextSplitter({
					chunkSize: 100,
					chunkOverlap: 10,
				});

				const repetitiveText = 'a'.repeat(1000);
				const estimatedChunks = ['chunk1', 'chunk2', 'chunk3'];

				(helpers.hasLongSequentialRepeat as jest.Mock).mockReturnValue(true);
				(tokenEstimator.estimateTextSplitsByTokens as jest.Mock).mockReturnValue(estimatedChunks);

				const result = await splitter.splitText(repetitiveText);

				// Should not call tiktoken
				expect(tiktokenUtils.getEncoding).not.toHaveBeenCalled();
				expect(mockTokenizer.encode).not.toHaveBeenCalled();

				// Should use estimation
				expect(helpers.hasLongSequentialRepeat).toHaveBeenCalledWith(repetitiveText);
				expect(tokenEstimator.estimateTextSplitsByTokens).toHaveBeenCalledWith(
					repetitiveText,
					100,
					10,
					'cl100k_base',
				);

				expect(result).toEqual(estimatedChunks);
			});

			it('should use tiktoken for non-repetitive content', async () => {
				const splitter = new TokenTextSplitter({
					chunkSize: 3,
					chunkOverlap: 0,
				});

				const normalText = 'This is normal text without repetition';
				const mockTokenIds = [1, 2, 3, 4, 5, 6];

				(helpers.hasLongSequentialRepeat as jest.Mock).mockReturnValue(false);
				mockTokenizer.encode.mockReturnValue(mockTokenIds);
				mockTokenizer.decode.mockImplementation(() => 'chunk');

				await splitter.splitText(normalText);

				// Should check for repetition
				expect(helpers.hasLongSequentialRepeat).toHaveBeenCalledWith(normalText);

				// Should use tiktoken
				expect(tiktokenUtils.getEncoding).toHaveBeenCalled();
				expect(mockTokenizer.encode).toHaveBeenCalled();

				// Should not use estimation
				expect(tokenEstimator.estimateTextSplitsByTokens).not.toHaveBeenCalled();
			});

			it('should handle repetitive content with different encodings', async () => {
				const splitter = new TokenTextSplitter({
					encodingName: 'o200k_base',
					chunkSize: 50,
					chunkOverlap: 5,
				});

				const repetitiveText = '.'.repeat(500);
				const estimatedChunks = ['estimated chunk 1', 'estimated chunk 2'];

				(helpers.hasLongSequentialRepeat as jest.Mock).mockReturnValue(true);
				(tokenEstimator.estimateTextSplitsByTokens as jest.Mock).mockReturnValue(estimatedChunks);

				const result = await splitter.splitText(repetitiveText);

				expect(tokenEstimator.estimateTextSplitsByTokens).toHaveBeenCalledWith(
					repetitiveText,
					50,
					5,
					'o200k_base',
				);
				expect(result).toEqual(estimatedChunks);
			});

			it('should handle edge case with exactly 100 repeating characters', async () => {
				const splitter = new TokenTextSplitter();
				const edgeText = 'x'.repeat(100);

				(helpers.hasLongSequentialRepeat as jest.Mock).mockReturnValue(true);
				(tokenEstimator.estimateTextSplitsByTokens as jest.Mock).mockReturnValue(['single chunk']);

				const result = await splitter.splitText(edgeText);

				expect(helpers.hasLongSequentialRepeat).toHaveBeenCalledWith(edgeText);
				expect(result).toEqual(['single chunk']);
			});

			it('should handle mixed content with repetitive sections', async () => {
				const splitter = new TokenTextSplitter();
				const mixedText = 'Normal text ' + 'z'.repeat(200) + ' more normal text';

				(helpers.hasLongSequentialRepeat as jest.Mock).mockReturnValue(true);
				(tokenEstimator.estimateTextSplitsByTokens as jest.Mock).mockReturnValue([
					'chunk1',
					'chunk2',
				]);

				const result = await splitter.splitText(mixedText);

				expect(helpers.hasLongSequentialRepeat).toHaveBeenCalledWith(mixedText);
				expect(tokenEstimator.estimateTextSplitsByTokens).toHaveBeenCalled();
				expect(result).toEqual(['chunk1', 'chunk2']);
			});
		});

		describe('error handling', () => {
			it('should return empty array for null input', async () => {
				const splitter = new TokenTextSplitter();
				const result = await splitter.splitText(null as any);
				expect(result).toEqual([]);
			});

			it('should return empty array for undefined input', async () => {
				const splitter = new TokenTextSplitter();
				const result = await splitter.splitText(undefined as any);
				expect(result).toEqual([]);
			});

			it('should return empty array for non-string input', async () => {
				const splitter = new TokenTextSplitter();
				const result = await splitter.splitText(123 as any);
				expect(result).toEqual([]);
			});

			it('should fall back to estimation if tiktoken fails', async () => {
				const splitter = new TokenTextSplitter();
				const text = 'This will cause tiktoken to fail';

				(helpers.hasLongSequentialRepeat as jest.Mock).mockReturnValue(false);
				(tiktokenUtils.getEncoding as jest.Mock).mockRejectedValue(new Error('Tiktoken error'));
				(tokenEstimator.estimateTextSplitsByTokens as jest.Mock).mockReturnValue([
					'fallback chunk',
				]);

				const result = await splitter.splitText(text);

				expect(result).toEqual(['fallback chunk']);
				expect(tokenEstimator.estimateTextSplitsByTokens).toHaveBeenCalledWith(
					text,
					splitter.chunkSize,
					splitter.chunkOverlap,
					splitter.encodingName,
				);
			});

			it('should fall back to estimation if encode fails', async () => {
				const splitter = new TokenTextSplitter();
				const text = 'This will cause encode to fail';

				(helpers.hasLongSequentialRepeat as jest.Mock).mockReturnValue(false);
				mockTokenizer.encode.mockImplementation(() => {
					throw new OperationalError('Encode error');
				});
				(tokenEstimator.estimateTextSplitsByTokens as jest.Mock).mockReturnValue([
					'fallback chunk',
				]);

				const result = await splitter.splitText(text);

				expect(result).toEqual(['fallback chunk']);
			});
		});
	});
});
