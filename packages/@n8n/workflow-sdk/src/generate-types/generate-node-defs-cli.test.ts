/**
 * Tests for generate-node-defs-cli
 *
 * Run with: cd packages/@n8n/workflow-sdk && pnpm jest generate-node-defs-cli
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { computeInputHash, generateNodeDefinitions } from './generate-node-defs-cli';

const MINIMAL_NODE = {
	name: 'n8n-nodes-base.testCliNode',
	displayName: 'Test CLI Node',
	description: 'A node for CLI testing',
	group: ['transform'],
	version: 1,
	properties: [
		{
			name: 'value',
			displayName: 'Value',
			type: 'string',
			default: '',
		},
	],
	inputs: ['main'],
	outputs: ['main'],
};

async function setupNodesJson(dir: string, nodes: unknown[]): Promise<string> {
	await fs.promises.mkdir(dir, { recursive: true });
	const nodesJsonPath = path.join(dir, 'nodes.json');
	await fs.promises.writeFile(nodesJsonPath, JSON.stringify(nodes));
	return nodesJsonPath;
}

describe('generate-node-defs-cli', () => {
	const tempDir = path.join(os.tmpdir(), `n8n-cli-test-${Date.now()}`);

	afterAll(async () => {
		await fs.promises.rm(tempDir, { recursive: true, force: true });
	});

	it('should read nodes.json from provided path and generate to output dir', async () => {
		const nodesJsonPath = await setupNodesJson(path.join(tempDir, 'input'), [MINIMAL_NODE]);
		const outputDir = path.join(tempDir, 'output');

		await generateNodeDefinitions({ nodesJsonPath, outputDir });

		const tsFile = path.join(outputDir, 'nodes', 'n8n-nodes-base', 'testCliNode', 'v1.ts');
		expect(fs.existsSync(tsFile)).toBe(true);

		const schemaFile = path.join(
			outputDir,
			'nodes',
			'n8n-nodes-base',
			'testCliNode',
			'v1.schema.js',
		);
		expect(fs.existsSync(schemaFile)).toBe(true);
	});

	it('should prefix un-dotted node names with packageName', async () => {
		const unprefixedNode = { ...MINIMAL_NODE, name: 'myNode' };
		const nodesJsonPath = await setupNodesJson(path.join(tempDir, 'input-prefix'), [
			unprefixedNode,
		]);
		const outputDir = path.join(tempDir, 'output-prefix');

		await generateNodeDefinitions({
			nodesJsonPath,
			outputDir,
			packageName: 'n8n-nodes-base',
		});

		const tsFile = path.join(outputDir, 'nodes', 'n8n-nodes-base', 'myNode', 'v1.ts');
		expect(fs.existsSync(tsFile)).toBe(true);

		const schemaFile = path.join(outputDir, 'nodes', 'n8n-nodes-base', 'myNode', 'v1.schema.js');
		expect(fs.existsSync(schemaFile)).toBe(true);
	});

	it('should error if nodes.json not found', async () => {
		const nonExistentPath = path.join(tempDir, 'nonexistent', 'nodes.json');
		const outputDir = path.join(tempDir, 'output-error');

		await expect(
			generateNodeDefinitions({ nodesJsonPath: nonExistentPath, outputDir }),
		).rejects.toThrow();
	});

	describe('hash-based skip', () => {
		it('should skip generation on second run with unchanged nodes.json', async () => {
			const nodesJsonPath = await setupNodesJson(path.join(tempDir, 'input-hash'), [MINIMAL_NODE]);
			const outputDir = path.join(tempDir, 'output-hash');

			// First run: generates files
			await generateNodeDefinitions({ nodesJsonPath, outputDir });
			const hashFile = path.join(outputDir, '.nodes-hash');
			expect(fs.existsSync(hashFile)).toBe(true);

			// Record file modification time
			const tsFile = path.join(outputDir, 'nodes', 'n8n-nodes-base', 'testCliNode', 'v1.ts');
			const firstMtime = (await fs.promises.stat(tsFile)).mtimeMs;

			// Small delay to ensure mtime would differ if file were rewritten
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Second run: should skip (files unchanged)
			const consoleSpy = jest.spyOn(console, 'log');
			await generateNodeDefinitions({ nodesJsonPath, outputDir });

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('up to date'));
			consoleSpy.mockRestore();

			// File should not have been rewritten
			const secondMtime = (await fs.promises.stat(tsFile)).mtimeMs;
			expect(secondMtime).toBe(firstMtime);
		});

		it('should regenerate when nodes.json content changes', async () => {
			const inputDir = path.join(tempDir, 'input-hash-change');
			const nodesJsonPath = await setupNodesJson(inputDir, [MINIMAL_NODE]);
			const outputDir = path.join(tempDir, 'output-hash-change');

			// First run
			await generateNodeDefinitions({ nodesJsonPath, outputDir });
			const hashBefore = await fs.promises.readFile(path.join(outputDir, '.nodes-hash'), 'utf-8');

			// Modify nodes.json
			const modifiedNode = {
				...MINIMAL_NODE,
				name: 'n8n-nodes-base.modifiedNode',
				displayName: 'Modified Node',
			};
			await fs.promises.writeFile(nodesJsonPath, JSON.stringify([modifiedNode]));

			// Second run: should regenerate
			await generateNodeDefinitions({ nodesJsonPath, outputDir });
			const hashAfter = await fs.promises.readFile(path.join(outputDir, '.nodes-hash'), 'utf-8');

			expect(hashAfter).not.toBe(hashBefore);

			// New node files should exist
			const newTsFile = path.join(outputDir, 'nodes', 'n8n-nodes-base', 'modifiedNode', 'v1.ts');
			expect(fs.existsSync(newTsFile)).toBe(true);
		});

		it('should regenerate when hash sentinel file is missing', async () => {
			const nodesJsonPath = await setupNodesJson(path.join(tempDir, 'input-hash-missing'), [
				MINIMAL_NODE,
			]);
			const outputDir = path.join(tempDir, 'output-hash-missing');

			// First run
			await generateNodeDefinitions({ nodesJsonPath, outputDir });
			const hashFile = path.join(outputDir, '.nodes-hash');
			expect(fs.existsSync(hashFile)).toBe(true);

			// Delete the hash sentinel
			await fs.promises.unlink(hashFile);

			// Should regenerate (not skip)
			const consoleSpy = jest.spyOn(console, 'log');
			await generateNodeDefinitions({ nodesJsonPath, outputDir });

			const logCalls = consoleSpy.mock.calls.map((c) => String(c[0]));
			expect(logCalls.some((msg) => msg.includes('Generated node definitions'))).toBe(true);
			consoleSpy.mockRestore();

			// Hash sentinel should be recreated
			expect(fs.existsSync(hashFile)).toBe(true);
		});
	});

	describe('computeInputHash', () => {
		it('should produce different hashes for different content', () => {
			const hash1 = computeInputHash('content-a', '0.1.0');
			const hash2 = computeInputHash('content-b', '0.1.0');
			expect(hash1).not.toBe(hash2);
		});

		it('should produce different hashes for different SDK versions', () => {
			const hash1 = computeInputHash('same-content', '0.1.0');
			const hash2 = computeInputHash('same-content', '0.2.0');
			expect(hash1).not.toBe(hash2);
		});

		it('should produce consistent hashes for same inputs', () => {
			const hash1 = computeInputHash('content', '0.1.0');
			const hash2 = computeInputHash('content', '0.1.0');
			expect(hash1).toBe(hash2);
		});
	});

	describe('parallel writes', () => {
		it('should produce correct file count and content with multiple nodes', async () => {
			const nodes = Array.from({ length: 5 }, (_, i) => ({
				...MINIMAL_NODE,
				name: `n8n-nodes-base.parallelNode${i}`,
				displayName: `Parallel Node ${i}`,
			}));
			const nodesJsonPath = await setupNodesJson(path.join(tempDir, 'input-parallel'), nodes);
			const outputDir = path.join(tempDir, 'output-parallel');

			await generateNodeDefinitions({ nodesJsonPath, outputDir });

			// Each node should have v1.ts, v1.schema.js, and index.ts (3 files per node)
			// Plus a root index.ts
			for (let i = 0; i < 5; i++) {
				const nodeDir = path.join(outputDir, 'nodes', 'n8n-nodes-base', `parallelNode${i}`);
				expect(fs.existsSync(path.join(nodeDir, 'v1.ts'))).toBe(true);
				expect(fs.existsSync(path.join(nodeDir, 'v1.schema.js'))).toBe(true);
				expect(fs.existsSync(path.join(nodeDir, 'index.ts'))).toBe(true);

				// Verify content is non-empty
				const tsContent = await fs.promises.readFile(path.join(nodeDir, 'v1.ts'), 'utf-8');
				expect(tsContent.length).toBeGreaterThan(0);
			}

			// Root index should exist
			expect(fs.existsSync(path.join(outputDir, 'index.ts'))).toBe(true);
		});
	});
});
