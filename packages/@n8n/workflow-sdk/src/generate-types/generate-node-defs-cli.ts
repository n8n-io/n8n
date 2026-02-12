/**
 * Build-time CLI for generating node definitions (types + schemas).
 *
 * Reads dist/types/nodes.json from CWD and generates to dist/node-definitions/.
 * Used as a post-build step in node packages (nodes-base, nodes-langchain).
 *
 * Features:
 * - Hash-based skip: computes SHA-256 of nodes.json + SDK version, skips if unchanged
 * - Parallel writes: files are written in batches for I/O performance
 *
 * Usage:
 *   n8n-generate-node-defs
 *   # or: npx tsx generate-node-defs-cli.ts
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import { jsonParse } from 'n8n-workflow';
import * as path from 'path';

import type { NodeTypeDescription } from './generate-types';
import { orchestrateGeneration } from './generate-types';

/** Name of the sentinel file storing the content hash */
const HASH_SENTINEL_FILE = '.nodes-hash';

export interface GenerateNodeDefinitionsOptions {
	nodesJsonPath: string;
	outputDir: string;
	packageName?: string;
}

/**
 * Compute a SHA-256 hash of the nodes.json content and SDK package version.
 * Including the SDK version ensures regeneration when generation logic changes.
 */
export function computeInputHash(content: string, sdkVersion: string): string {
	return createHash('sha256').update(content).update(sdkVersion).digest('hex');
}

/**
 * Read the SDK package version from its package.json.
 */
function getSdkVersion(): string {
	const sdkPackageJsonPath = path.join(__dirname, '..', '..', 'package.json');
	try {
		const pkg = JSON.parse(fs.readFileSync(sdkPackageJsonPath, 'utf-8')) as { version: string };
		return pkg.version;
	} catch {
		return 'unknown';
	}
}

/**
 * Generate node definitions from a nodes.json file.
 * Skips generation if the input hash matches the stored sentinel.
 * Testable core logic extracted from CLI entry point.
 */
export async function generateNodeDefinitions(
	options: GenerateNodeDefinitionsOptions,
): Promise<void> {
	const { nodesJsonPath, outputDir, packageName } = options;

	if (!fs.existsSync(nodesJsonPath)) {
		throw new Error(`nodes.json not found at ${nodesJsonPath}`);
	}

	const content = await fs.promises.readFile(nodesJsonPath, 'utf-8');

	// Hash-based skip: check if output is already up to date
	const sdkVersion = getSdkVersion();
	const inputHash = computeInputHash(content, sdkVersion);
	const hashFilePath = path.join(outputDir, HASH_SENTINEL_FILE);

	try {
		const existingHash = await fs.promises.readFile(hashFilePath, 'utf-8');
		if (existingHash.trim() === inputHash) {
			console.log('Node definitions up to date (hash match), skipping generation.');
			return;
		}
	} catch {
		// Hash file doesn't exist — proceed with generation
	}

	const nodes = jsonParse<NodeTypeDescription[]>(content);

	if (packageName) {
		for (const node of nodes) {
			if (!node.name.includes('.')) {
				node.name = `${packageName}.${node.name}`;
			}
		}
	}

	const result = await orchestrateGeneration({ nodes, outputDir });

	// Write hash sentinel after successful generation
	await fs.promises.mkdir(outputDir, { recursive: true });
	await fs.promises.writeFile(hashFilePath, inputHash);

	console.log(`Generated node definitions for ${result.nodeCount} nodes in ${outputDir}`);
}

// CLI entry point
if (require.main === module) {
	const cwd = process.cwd();
	const nodesJsonPath = path.join(cwd, 'dist', 'types', 'nodes.json');
	const outputDir = path.join(cwd, 'dist', 'node-definitions');

	const packageJsonPath = path.join(cwd, 'package.json');
	const packageJson = jsonParse<{ name: string }>(fs.readFileSync(packageJsonPath, 'utf-8'));

	generateNodeDefinitions({ nodesJsonPath, outputDir, packageName: packageJson.name }).catch(
		(error) => {
			console.error('Node definition generation failed:', error);
			process.exit(1);
		},
	);
}
