/**
 * Shared test setup for schema validation tests.
 *
 * Generates node schemas to a temp directory under os.tmpdir() so tests
 * are self-contained and don't depend on pre-built dist artifacts being
 * in a particular location.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { setSchemaBaseDirs, getSchemaBaseDirs } from './schema-validator';
import { generateNodeDefinitions } from '../generate-types/generate-node-defs-cli';

const SCHEMA_TEST_DIR = path.join(os.tmpdir(), 'n8n-schema-tests');
const STAMP_FILE = path.join(SCHEMA_TEST_DIR, '.generator-hash');

let originalBaseDirs: string[] | undefined;

/**
 * Compute a hash of the schema generator source so we can detect when
 * cached schemas in the temp directory are stale.
 */
function computeGeneratorHash(): string {
	const generatorPath = path.resolve(__dirname, '../generate-types/generate-zod-schemas.ts');
	try {
		const content = fs.readFileSync(generatorPath, 'utf-8');
		return crypto.createHash('md5').update(content).digest('hex');
	} catch {
		// If the source can't be read, always regenerate
		return '';
	}
}

/**
 * Check whether the cached schemas are still valid by comparing
 * the stored generator hash with the current one.
 */
function isCacheValid(): boolean {
	try {
		if (!fs.existsSync(STAMP_FILE)) return false;
		const storedHash = fs.readFileSync(STAMP_FILE, 'utf-8').trim();
		const currentHash = computeGeneratorHash();
		return storedHash === currentHash && currentHash !== '';
	} catch {
		return false;
	}
}

/**
 * Generate schemas to a temp directory and configure the schema validator to use them.
 * Reuses previously generated schemas only if the generator source hasn't changed.
 */
export async function setupTestSchemas(): Promise<void> {
	originalBaseDirs = getSchemaBaseDirs();

	const nodesDir = path.join(SCHEMA_TEST_DIR, 'nodes');
	const nodesDirExists = fs.existsSync(nodesDir);
	const cacheValid = isCacheValid();

	if (!nodesDirExists || !cacheValid) {
		// Remove stale schemas if they exist
		if (fs.existsSync(SCHEMA_TEST_DIR)) {
			fs.rmSync(SCHEMA_TEST_DIR, { recursive: true, force: true });
		}

		const repoRoot = path.resolve(__dirname, '../../../../..');

		const nodesBaseJson = path.join(repoRoot, 'packages/nodes-base/dist/types/nodes.json');
		if (fs.existsSync(nodesBaseJson)) {
			await generateNodeDefinitions({
				nodesJsonPath: nodesBaseJson,
				outputDir: SCHEMA_TEST_DIR,
				packageName: 'n8n-nodes-base',
			});
		}

		const langchainJson = path.join(
			repoRoot,
			'packages/@n8n/nodes-langchain/dist/types/nodes.json',
		);
		if (fs.existsSync(langchainJson)) {
			await generateNodeDefinitions({
				nodesJsonPath: langchainJson,
				outputDir: SCHEMA_TEST_DIR,
				packageName: '@n8n/n8n-nodes-langchain',
			});
		}

		// Write the generator hash so future runs can skip regeneration
		const hash = computeGeneratorHash();
		if (hash) {
			fs.mkdirSync(SCHEMA_TEST_DIR, { recursive: true });
			fs.writeFileSync(STAMP_FILE, hash);
		}
	}

	setSchemaBaseDirs([SCHEMA_TEST_DIR]);
}

/**
 * Restore original schema base dirs after tests complete.
 */
export function teardownTestSchemas(): void {
	if (originalBaseDirs !== undefined) {
		setSchemaBaseDirs(originalBaseDirs);
	}
}
