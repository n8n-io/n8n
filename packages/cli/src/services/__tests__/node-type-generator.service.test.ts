/**
 * Tests for NodeTypeGeneratorService
 *
 * Following TDD: These tests are written BEFORE the implementation.
 * Run with: cd packages/cli && pnpm test src/services/__tests__/node-type-generator.service.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';

import { NodeTypeGeneratorService } from '../node-type-generator.service';

// Mock fs module
jest.mock('fs', () => ({
	promises: {
		readFile: jest.fn(),
		writeFile: jest.fn(),
		mkdir: jest.fn(),
	},
	existsSync: jest.fn(),
}));

describe('NodeTypeGeneratorService', () => {
	const mockLogger = mock<Logger>();
	const generatedTypesDir = '/test/.n8n/generated-types';
	const mockInstanceSettings = mock<InstanceSettings>({ generatedTypesDir });

	let service: NodeTypeGeneratorService;

	const sampleNodesJson = JSON.stringify([
		{
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			version: [4, 4.1, 4.2],
			properties: [],
			inputs: ['main'],
			outputs: ['main'],
			group: ['transform'],
		},
	]);

	beforeEach(() => {
		jest.resetAllMocks();
		service = new NodeTypeGeneratorService(mockLogger, mockInstanceSettings);
	});

	describe('constructor', () => {
		it('should be injectable with Logger and InstanceSettings', () => {
			expect(service).toBeDefined();
			expect(service).toBeInstanceOf(NodeTypeGeneratorService);
		});
	});

	describe('generateIfNeeded', () => {
		const nodesJsonPath = '/path/to/nodes.json';
		const hashFilePath = path.join(generatedTypesDir, 'nodes.json.hash');

		it('should generate types if hash file does not exist', async () => {
			// Hash file doesn't exist
			(fs.existsSync as jest.Mock).mockReturnValue(false);
			(fs.promises.readFile as jest.Mock).mockResolvedValue(sampleNodesJson);
			(fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
			(fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

			const result = await service.generateIfNeeded(nodesJsonPath);

			expect(result).toBe(true); // Types were generated
			expect(fs.promises.mkdir).toHaveBeenCalledWith(
				expect.stringContaining('generated-types'),
				expect.objectContaining({ recursive: true }),
			);
		});

		it('should skip generation if hash matches', async () => {
			const content = sampleNodesJson;
			const expectedHash = service.computeHash(content);

			// Hash file exists with matching hash
			(fs.existsSync as jest.Mock).mockReturnValue(true);
			(fs.promises.readFile as jest.Mock).mockImplementation((filePath: string) => {
				if (filePath === nodesJsonPath) return Promise.resolve(content);
				if (filePath === hashFilePath) return Promise.resolve(expectedHash);
				return Promise.reject(new Error('Unexpected file'));
			});

			const result = await service.generateIfNeeded(nodesJsonPath);

			expect(result).toBe(false); // Types were NOT generated (hash matched)
		});

		it('should regenerate types if hash differs', async () => {
			const content = sampleNodesJson;

			// Hash file exists but with different hash
			(fs.existsSync as jest.Mock).mockReturnValue(true);
			(fs.promises.readFile as jest.Mock).mockImplementation((filePath: string) => {
				if (filePath === nodesJsonPath) return Promise.resolve(content);
				if (filePath === hashFilePath) return Promise.resolve('old-different-hash');
				return Promise.reject(new Error('Unexpected file'));
			});
			(fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
			(fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

			const result = await service.generateIfNeeded(nodesJsonPath);

			expect(result).toBe(true); // Types were regenerated
			// New hash should be written
			expect(fs.promises.writeFile).toHaveBeenCalledWith(
				hashFilePath,
				expect.any(String),
				'utf-8',
			);
		});
	});

	describe('generate', () => {
		const nodesJsonPath = '/path/to/nodes.json';

		it('should create the generated-types directory if it does not exist', async () => {
			(fs.promises.readFile as jest.Mock).mockResolvedValue(sampleNodesJson);
			(fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
			(fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

			await service.generate(nodesJsonPath);

			expect(fs.promises.mkdir).toHaveBeenCalledWith(generatedTypesDir, { recursive: true });
		});

		it('should write the hash file after generation', async () => {
			const hashFilePath = path.join(generatedTypesDir, 'nodes.json.hash');

			(fs.promises.readFile as jest.Mock).mockResolvedValue(sampleNodesJson);
			(fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
			(fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

			await service.generate(nodesJsonPath);

			// Should write hash file
			expect(fs.promises.writeFile).toHaveBeenCalledWith(
				hashFilePath,
				expect.any(String),
				'utf-8',
			);
		});

		it('should generate node type files in the nodes subdirectory', async () => {
			(fs.promises.readFile as jest.Mock).mockResolvedValue(sampleNodesJson);
			(fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
			(fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

			await service.generate(nodesJsonPath);

			// Should create node directories
			expect(fs.promises.mkdir).toHaveBeenCalledWith(
				expect.stringContaining('nodes'),
				expect.objectContaining({ recursive: true }),
			);
		});
	});

	describe('computeHash', () => {
		it('should compute MD5 hash of content', () => {
			const content = 'test content';
			const hash = service.computeHash(content);

			expect(hash).toBeDefined();
			expect(typeof hash).toBe('string');
			expect(hash.length).toBe(32); // MD5 hash is 32 hex chars
		});

		it('should return different hashes for different content', () => {
			const hash1 = service.computeHash('content1');
			const hash2 = service.computeHash('content2');

			expect(hash1).not.toBe(hash2);
		});

		it('should return same hash for same content', () => {
			const content = 'same content';
			const hash1 = service.computeHash(content);
			const hash2 = service.computeHash(content);

			expect(hash1).toBe(hash2);
		});
	});
});
