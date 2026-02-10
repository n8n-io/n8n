/**
 * Tests for NodeDefinitionGeneratorService
 *
 * Following TDD: These tests are written BEFORE the implementation.
 * Run with: cd packages/cli && pnpm jest src/services/__tests__/node-definition-generator.service.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';

import { NodeDefinitionGeneratorService } from '../node-definition-generator.service';

// Mock fs module
jest.mock('fs', () => ({
	promises: {
		readFile: jest.fn(),
		writeFile: jest.fn(),
		mkdir: jest.fn(),
		rm: jest.fn(),
	},
	existsSync: jest.fn(),
}));

describe('NodeDefinitionGeneratorService', () => {
	const mockLogger = mock<Logger>();
	const nodeDefinitionsDir = '/test/.n8n/node-definitions';
	const mockInstanceSettings = mock<InstanceSettings>({ nodeDefinitionsDir });

	let service: NodeDefinitionGeneratorService;

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
		service = new NodeDefinitionGeneratorService(mockLogger, mockInstanceSettings);
	});

	describe('constructor', () => {
		it('should be injectable with Logger and InstanceSettings', () => {
			expect(service).toBeDefined();
			expect(service).toBeInstanceOf(NodeDefinitionGeneratorService);
		});
	});

	describe('generateIfNeeded', () => {
		const nodesJsonPath = '/path/to/nodes.json';
		const hashFilePath = path.join(nodeDefinitionsDir, 'nodes.json.hash');

		it('should generate types if hash file does not exist', async () => {
			// Hash file doesn't exist
			(fs.existsSync as jest.Mock).mockReturnValue(false);
			(fs.promises.readFile as jest.Mock).mockResolvedValue(sampleNodesJson);
			(fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
			(fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

			const result = await service.generateIfNeeded(nodesJsonPath);

			expect(result).toBe(true); // Types were generated
			expect(fs.promises.mkdir).toHaveBeenCalledWith(
				expect.stringContaining('node-definitions'),
				expect.objectContaining({ recursive: true }),
			);
		});

		it('should skip generation if hash matches', async () => {
			const content = sampleNodesJson;
			const expectedHash = service.computeHash(content);

			// Hash file exists with matching hash
			(fs.existsSync as jest.Mock).mockReturnValue(true);
			(fs.promises.readFile as jest.Mock).mockImplementation(async (filePath: string) => {
				if (filePath === nodesJsonPath) return content;
				if (filePath === hashFilePath) return expectedHash;
				throw new Error('Unexpected file');
			});

			const result = await service.generateIfNeeded(nodesJsonPath);

			expect(result).toBe(false); // Types were NOT generated (hash matched)
		});

		it('should regenerate types if hash differs', async () => {
			const content = sampleNodesJson;

			// Hash file exists but with different hash
			(fs.existsSync as jest.Mock).mockReturnValue(true);
			(fs.promises.readFile as jest.Mock).mockImplementation(async (filePath: string) => {
				if (filePath === nodesJsonPath) return content;
				if (filePath === hashFilePath) return 'old-different-hash';
				throw new Error('Unexpected file');
			});
			(fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
			(fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

			const result = await service.generateIfNeeded(nodesJsonPath);

			expect(result).toBe(true); // Types were regenerated
			// New hash should be written
			expect(fs.promises.writeFile).toHaveBeenCalledWith(hashFilePath, expect.any(String), 'utf-8');
		});
	});

	describe('generate', () => {
		const nodesJsonPath = '/path/to/nodes.json';

		it('should create the node-definitions directory if it does not exist', async () => {
			(fs.promises.readFile as jest.Mock).mockResolvedValue(sampleNodesJson);
			(fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
			(fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

			await service.generate(nodesJsonPath);

			expect(fs.promises.mkdir).toHaveBeenCalledWith(nodeDefinitionsDir, { recursive: true });
		});

		it('should write the hash file after generation', async () => {
			const hashFilePath = path.join(nodeDefinitionsDir, 'nodes.json.hash');

			(fs.promises.readFile as jest.Mock).mockResolvedValue(sampleNodesJson);
			(fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
			(fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

			await service.generate(nodesJsonPath);

			// Should write hash file
			expect(fs.promises.writeFile).toHaveBeenCalledWith(hashFilePath, expect.any(String), 'utf-8');
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

	describe('getNodeDefinitionDirs', () => {
		it('should return built-in dirs from node packages first, then community dir', () => {
			const dirs = service.getNodeDefinitionDirs();
			// Should have at least the community dir
			expect(dirs).toContain(nodeDefinitionsDir);
			// Community dir should be last
			expect(dirs[dirs.length - 1]).toBe(nodeDefinitionsDir);
		});
	});

	describe('removeForPackage', () => {
		it('should remove package directory from nodeDefinitionsDir', async () => {
			(fs.promises.rm as jest.Mock).mockResolvedValue(undefined);

			await service.removeForPackage('n8n-nodes-custom');

			expect(fs.promises.rm).toHaveBeenCalledWith(
				path.join(nodeDefinitionsDir, 'nodes', 'n8n-nodes-custom'),
				{ recursive: true, force: true },
			);
		});
	});
});
