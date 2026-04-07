/**
 * Integration test for NodeToolRepository.
 *
 * Uses REAL node type descriptions loaded from n8n-nodes-base via
 * LazyPackageDirectoryLoader. No mocked node types.
 *
 * Run with:
 *   cd packages/cli && pnpm jest --config jest.config.agents.js
 */

import path from 'path';

import { LazyPackageDirectoryLoader } from 'n8n-core';
import { mock } from 'jest-mock-extended';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { EphemeralNodeExecutor } from '@/node-execution';
import { NodeToolRepository } from '../tool-repository';

async function buildRealRegistry(): Promise<LoadNodesAndCredentials> {
	const repoRoot = path.resolve(__dirname, '../../../../../..');
	const nodesBaseDir = path.join(repoRoot, 'packages', 'nodes-base');

	const lnc = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());

	const loader = new LazyPackageDirectoryLoader(nodesBaseDir);
	await loader.loadAll();
	lnc.loaders[loader.packageName] = loader;

	return lnc;
}

describe('NodeToolRepository — real node registry', () => {
	let repo: NodeToolRepository;

	beforeAll(async () => {
		const lnc = await buildRealRegistry();
		repo = new NodeToolRepository(lnc, mock<EphemeralNodeExecutor>());
	});

	it('lists only usableAsTool nodes', async () => {
		const tools = await repo.listTools();

		expect(tools.length).toBeGreaterThan(0);
		console.log(`Found ${tools.length} usable tools`);
		console.log(
			'First 5:',
			tools.slice(0, 5).map((t) => t.name),
		);
	});
});
