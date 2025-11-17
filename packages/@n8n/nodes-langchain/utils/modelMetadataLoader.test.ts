import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { safeJoinPath, isContainedWithin } from '@n8n/backend-common';
import type { IModelMetadata } from 'n8n-workflow';
import { loadModelMetadata, clearMetadataCache } from './modelMetadataLoader';

// Mock fs/promises
jest.mock('fs/promises');
// Mock @n8n/backend-common
jest.mock('@n8n/backend-common');

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockedAccess = access as jest.MockedFunction<typeof access>;
const mockedSafeJoinPath = safeJoinPath as jest.MockedFunction<typeof safeJoinPath>;
const mockedIsContainedWithin = isContainedWithin as jest.MockedFunction<typeof isContainedWithin>;

describe('modelMetadataLoader', () => {
	const mockMetadata: IModelMetadata = {
		id: 'gpt-4',
		name: 'GPT-4',
		provider: 'openai',
		pricing: {
			promptPerMilTokenUsd: 0.03,
			completionPerMilTokenUsd: 0.06,
		},
		contextLength: 8192,
		capabilities: {
			functionCalling: true,
			structuredOutput: true,
		},
		intelligenceLevel: 'high',
	};

	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();
		clearMetadataCache();

		// Setup default mock implementations
		mockedSafeJoinPath.mockImplementation((...paths: string[]) => join(...paths));
		mockedIsContainedWithin.mockReturnValue(true);
	});

	describe('loadModelMetadata', () => {
		it('should load metadata for a valid model', async () => {
			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockResolvedValue(JSON.stringify(mockMetadata));

			const result = await loadModelMetadata('openai', 'gpt-4');

			expect(result).toEqual(mockMetadata);
			expect(mockedReadFile).toHaveBeenCalledTimes(1);
			expect(mockedAccess).toHaveBeenCalledTimes(1);
		});

		it('should return cached metadata on second call', async () => {
			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockResolvedValue(JSON.stringify(mockMetadata));

			// First call
			const result1 = await loadModelMetadata('openai', 'gpt-4');
			// Second call
			const result2 = await loadModelMetadata('openai', 'gpt-4');

			expect(result1).toEqual(mockMetadata);
			expect(result2).toEqual(mockMetadata);
			// File should only be read once
			expect(mockedReadFile).toHaveBeenCalledTimes(1);
		});

		it('should return undefined for non-existent model', async () => {
			mockedAccess.mockRejectedValue(new Error('File not found'));

			const result = await loadModelMetadata('openai', 'non-existent-model');

			expect(result).toBeUndefined();
			expect(mockedReadFile).not.toHaveBeenCalled();
		});

		it('should cache undefined results for missing files', async () => {
			mockedAccess.mockRejectedValue(new Error('File not found'));

			// First call
			await loadModelMetadata('openai', 'missing-model');
			// Second call
			await loadModelMetadata('openai', 'missing-model');

			// Access should only be called once since undefined is cached
			expect(mockedAccess).toHaveBeenCalledTimes(1);
		});

		it('should reject path traversal in provider name', async () => {
			const result = await loadModelMetadata('../malicious', 'model');

			expect(result).toBeUndefined();
			expect(mockedReadFile).not.toHaveBeenCalled();
			expect(mockedAccess).not.toHaveBeenCalled();
		});

		it('should reject path traversal in model ID', async () => {
			const result = await loadModelMetadata('openai', '../../../etc/passwd');

			expect(result).toBeUndefined();
			expect(mockedReadFile).not.toHaveBeenCalled();
			expect(mockedAccess).not.toHaveBeenCalled();
		});

		it('should reject empty provider name', async () => {
			const result = await loadModelMetadata('', 'model');

			expect(result).toBeUndefined();
			expect(mockedReadFile).not.toHaveBeenCalled();
		});

		it('should reject empty model ID', async () => {
			const result = await loadModelMetadata('openai', '');

			expect(result).toBeUndefined();
			expect(mockedReadFile).not.toHaveBeenCalled();
		});

		it('should return undefined when path is not contained within metadata directory', async () => {
			mockedIsContainedWithin.mockReturnValue(false);
			mockedAccess.mockResolvedValue(undefined);

			const result = await loadModelMetadata('openai', 'model');

			expect(result).toBeUndefined();
			expect(mockedReadFile).not.toHaveBeenCalled();
		});

		it('should return undefined for invalid JSON', async () => {
			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockResolvedValue('invalid json{{{');

			const result = await loadModelMetadata('openai', 'model');

			expect(result).toBeUndefined();
		});

		it('should return undefined for metadata missing required fields', async () => {
			const invalidMetadata = {
				id: 'gpt-4',
				// Missing name and provider
				pricing: {
					promptPerMilTokenUsd: 0.03,
					completionPerMilTokenUsd: 0.06,
				},
			};

			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockResolvedValue(JSON.stringify(invalidMetadata));

			const result = await loadModelMetadata('openai', 'model');

			expect(result).toBeUndefined();
		});

		it('should use safeJoinPath for constructing paths', async () => {
			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockResolvedValue(JSON.stringify(mockMetadata));

			await loadModelMetadata('openai', 'gpt-4');

			expect(mockedSafeJoinPath).toHaveBeenCalled();
		});
	});

	describe('alias resolution', () => {
		it('should resolve model ID through aliases', async () => {
			const aliasesContent = {
				'chatgpt-4o-latest': 'gpt-4o',
			};

			// Mock alias file access and read
			mockedAccess.mockImplementation(async (path: any) => {
				if (path.includes('_aliases.json')) {
					return undefined;
				}
				if (path.includes('gpt-4o.json')) {
					return undefined;
				}
				throw new Error('File not found');
			});

			mockedReadFile.mockImplementation(async (path: any) => {
				if (path.includes('_aliases.json')) {
					return JSON.stringify(aliasesContent);
				}
				if (path.includes('gpt-4o.json')) {
					return JSON.stringify({ ...mockMetadata, id: 'gpt-4o' });
				}
				throw new Error('File not found');
			});

			const result = await loadModelMetadata('openai', 'chatgpt-4o-latest');

			expect(result).toBeDefined();
			expect(result?.id).toBe('gpt-4o');
		});

		it('should use original model ID if no alias exists', async () => {
			// No aliases file
			mockedAccess.mockImplementation(async (path: any) => {
				if (path.includes('_aliases.json')) {
					throw new Error('File not found');
				}
				if (path.includes('gpt-4.json')) {
					return undefined;
				}
				throw new Error('File not found');
			});

			mockedReadFile.mockImplementation(async (path: any) => {
				if (path.includes('gpt-4.json')) {
					return JSON.stringify(mockMetadata);
				}
				throw new Error('File not found');
			});

			const result = await loadModelMetadata('openai', 'gpt-4');

			expect(result).toEqual(mockMetadata);
		});

		it('should cache aliases to avoid repeated reads', async () => {
			const aliasesContent = {
				latest: 'gpt-4',
			};

			mockedAccess.mockImplementation(async (path: any) => {
				if (path.includes('_aliases.json')) {
					return undefined;
				}
				return undefined;
			});

			mockedReadFile.mockImplementation(async (path: any) => {
				if (path.includes('_aliases.json')) {
					return JSON.stringify(aliasesContent);
				}
				return JSON.stringify(mockMetadata);
			});

			// First call
			await loadModelMetadata('openai', 'model-1');
			// Clear only metadata cache, not alias cache
			const aliasReadCount = mockedReadFile.mock.calls.filter((call) =>
				call[0].toString().includes('_aliases.json'),
			).length;

			// Second call with different model but same provider
			await loadModelMetadata('openai', 'model-2');

			// Aliases should still have been read only once
			const aliasReadCountAfter = mockedReadFile.mock.calls.filter((call) =>
				call[0].toString().includes('_aliases.json'),
			).length;

			expect(aliasReadCountAfter).toBe(aliasReadCount);
		});
	});

	describe('clearMetadataCache', () => {
		it('should clear both metadata and alias caches', async () => {
			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockResolvedValue(JSON.stringify(mockMetadata));

			// Load metadata
			await loadModelMetadata('openai', 'gpt-4');
			expect(mockedReadFile).toHaveBeenCalledTimes(1);

			// Clear cache
			clearMetadataCache();

			// Load again
			await loadModelMetadata('openai', 'gpt-4');

			// Should read file again since cache was cleared
			expect(mockedReadFile).toHaveBeenCalledTimes(2);
		});
	});

	describe('error handling', () => {
		it('should handle file read errors gracefully', async () => {
			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockRejectedValue(new Error('Permission denied'));

			const result = await loadModelMetadata('openai', 'model');

			expect(result).toBeUndefined();
		});

		it('should not log in production', async () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';
			const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockRejectedValue(new Error('Some error'));

			await loadModelMetadata('openai', 'model');

			expect(consoleSpy).not.toHaveBeenCalled();

			process.env.NODE_ENV = originalEnv;
			consoleSpy.mockRestore();
		});
	});

	describe('parallel loading', () => {
		it('should handle concurrent requests for the same model', async () => {
			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockResolvedValue(JSON.stringify(mockMetadata));

			// Make multiple concurrent requests
			const results = await Promise.all([
				loadModelMetadata('openai', 'gpt-4'),
				loadModelMetadata('openai', 'gpt-4'),
				loadModelMetadata('openai', 'gpt-4'),
			]);

			// All should return the same metadata
			results.forEach((result) => expect(result).toEqual(mockMetadata));

			// File should be read at least once (race condition may cause multiple reads)
			expect(mockedReadFile).toHaveBeenCalled();
		});

		it('should handle concurrent requests for different models', async () => {
			mockedAccess.mockResolvedValue(undefined);
			mockedReadFile.mockImplementation(async (path: any) => {
				const modelId = path.toString().includes('gpt-4') ? 'gpt-4' : 'gpt-3.5';
				return JSON.stringify({ ...mockMetadata, id: modelId });
			});

			const [result1, result2] = await Promise.all([
				loadModelMetadata('openai', 'gpt-4'),
				loadModelMetadata('openai', 'gpt-3.5'),
			]);

			expect(result1?.id).toBe('gpt-4');
			expect(result2?.id).toBe('gpt-3.5');
			expect(mockedReadFile).toHaveBeenCalledTimes(2);
		});
	});
});
