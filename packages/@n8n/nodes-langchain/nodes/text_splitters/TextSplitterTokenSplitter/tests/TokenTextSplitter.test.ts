import * as tiktokenUtils from '../../../../utils/tokenizer/tiktoken';
import { TokenTextSplitter } from '../TokenTextSplitter';

jest.mock('../../../../utils/tokenizer/tiktoken');

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
	});
});
