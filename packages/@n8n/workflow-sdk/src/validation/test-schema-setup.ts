/**
 * Shared test setup for schema validation tests.
 *
 * Generates node schemas to a temp directory under os.tmpdir() so tests
 * are self-contained and don't depend on pre-built dist artifacts being
 * in a particular location.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { setSchemaBaseDirs, getSchemaBaseDirs } from './schema-validator';
import { generateNodeDefinitions } from '../generate-types/generate-node-defs-cli';

const SCHEMA_TEST_DIR = path.join(os.tmpdir(), 'n8n-schema-tests');

let originalBaseDirs: string[] | undefined;

/**
 * Generate schemas to a temp directory and configure the schema validator to use them.
 * Reuses previously generated schemas if the temp directory already exists.
 */
export async function setupTestSchemas(): Promise<void> {
	originalBaseDirs = getSchemaBaseDirs();

	const nodesDir = path.join(SCHEMA_TEST_DIR, 'nodes');

	if (!fs.existsSync(nodesDir)) {
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
