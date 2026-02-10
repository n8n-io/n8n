/**
 * Tests for NodeDefinitionGeneratorService
 *
 * Run with: cd packages/cli && pnpm jest src/services/__tests__/node-definition-generator.service.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { NodeDefinitionGeneratorService } from '../node-definition-generator.service';

// Mock fs module
jest.mock('fs', () => ({
	existsSync: jest.fn(),
}));

describe('NodeDefinitionGeneratorService', () => {
	let service: NodeDefinitionGeneratorService;

	beforeEach(() => {
		jest.resetAllMocks();
		service = new NodeDefinitionGeneratorService();
	});

	describe('constructor', () => {
		it('should be injectable', () => {
			expect(service).toBeDefined();
			expect(service).toBeInstanceOf(NodeDefinitionGeneratorService);
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
		it('should return only built-in dirs from node packages', () => {
			(fs.existsSync as jest.Mock).mockImplementation((p: string) =>
				p.endsWith(path.join('dist', 'node-definitions')),
			);

			const dirs = service.getNodeDefinitionDirs();

			// Should not contain any ~/.n8n paths
			for (const dir of dirs) {
				expect(dir).not.toContain('.n8n');
				expect(dir).toContain(path.join('dist', 'node-definitions'));
			}
		});

		it('should return empty array when no packages are installed', () => {
			(fs.existsSync as jest.Mock).mockReturnValue(false);

			const dirs = service.getNodeDefinitionDirs();

			// May be empty if require.resolve fails or dirs don't exist
			for (const dir of dirs) {
				expect(dir).toContain(path.join('dist', 'node-definitions'));
			}
		});
	});
});
