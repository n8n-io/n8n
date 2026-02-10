/**
 * Tests for generate-node-defs-cli
 *
 * Run with: cd packages/@n8n/workflow-sdk && pnpm jest generate-node-defs-cli
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { generateNodeDefinitions } from './generate-node-defs-cli';

describe('generate-node-defs-cli', () => {
	const tempDir = path.join(os.tmpdir(), `n8n-cli-test-${Date.now()}`);

	afterAll(async () => {
		await fs.promises.rm(tempDir, { recursive: true, force: true });
	});

	it('should read nodes.json from provided path and generate to output dir', async () => {
		// Set up a temp dir with a nodes.json containing a minimal node
		const nodesJsonDir = path.join(tempDir, 'input');
		const outputDir = path.join(tempDir, 'output');
		await fs.promises.mkdir(nodesJsonDir, { recursive: true });

		const minimalNodes = [
			{
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
			},
		];
		const nodesJsonPath = path.join(nodesJsonDir, 'nodes.json');
		await fs.promises.writeFile(nodesJsonPath, JSON.stringify(minimalNodes));

		await generateNodeDefinitions({ nodesJsonPath, outputDir });

		// Verify output has .ts and .schema.js files
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
		const nodesJsonDir = path.join(tempDir, 'input-prefix');
		const outputDir = path.join(tempDir, 'output-prefix');
		await fs.promises.mkdir(nodesJsonDir, { recursive: true });

		const minimalNodes = [
			{
				name: 'myNode',
				displayName: 'My Node',
				description: 'A node without package prefix',
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
			},
		];
		const nodesJsonPath = path.join(nodesJsonDir, 'nodes.json');
		await fs.promises.writeFile(nodesJsonPath, JSON.stringify(minimalNodes));

		await generateNodeDefinitions({
			nodesJsonPath,
			outputDir,
			packageName: 'n8n-nodes-base',
		});

		// Should be generated under the package name directory
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
});
