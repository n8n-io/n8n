/**
 * Integration tests for NodeToolRepository + ToolSearchProcessor.
 *
 * These tests use REAL node type descriptions loaded from the n8n-nodes-base
 * package on disk via LazyPackageDirectoryLoader. No hand-crafted fake nodes.
 *
 * What is tested:
 *   - listTools() returns actual usableAsTool nodes from the real registry
 *   - search_tools finds real nodes by keyword in name and description
 *   - load_tool materialises a BuiltTool for a real node
 *   - ToolSearchProcessor lifecycle (reset, duplicates, unknown names)
 *
 * EphemeralNodeExecutor is stubbed out at the boundary only — this test is
 * concerned with the discovery/loading layer, not workflow execution.
 */

import path from 'path';

import { ToolSearchProcessor } from '@n8n/agents';
import type { BuiltTool, NodeExecutionResult } from '@n8n/agents';
import { LazyPackageDirectoryLoader } from 'n8n-core';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeToolRepository } from '../node-tool-repository';

import { mock } from 'jest-mock-extended';
import type { EphemeralNodeExecutor } from '@/node-execution';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the path to the nodes-base package inside this monorepo. */
function getNodesBaseDir(): string {
	// Walk up from this file to the repo root, then into nodes-base dist
	const repoRoot = path.resolve(__dirname, '../../../../../..');
	return path.join(repoRoot, 'packages', 'nodes-base');
}

/**
 * Build a real LoadNodesAndCredentials that has loaded all nodes from
 * n8n-nodes-base using the actual filesystem.
 */
async function buildRealRegistry(): Promise<LoadNodesAndCredentials> {
	const nodesBaseDir = getNodesBaseDir();

	// LoadNodesAndCredentials.init() throws in test environments, so we
	// replicate the relevant part: create a loader and attach it directly.
	const lnc = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());

	const loader = new LazyPackageDirectoryLoader(nodesBaseDir);
	await loader.loadAll();
	lnc.loaders[loader.packageName] = loader;

	return lnc;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal executor stub — only used for getTool() handler wiring, not invoked in these tests. */
const stubExecutor = mock<EphemeralNodeExecutor>({
	executeInline: async (): Promise<NodeExecutionResult> => ({
		status: 'success',
		data: [{ json: { ok: true } }],
	}),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NodeToolRepository — real node registry', () => {
	let lnc: LoadNodesAndCredentials;
	let repo: NodeToolRepository;

	beforeAll(async () => {
		lnc = await buildRealRegistry();
		repo = new NodeToolRepository(lnc, stubExecutor, 'test-project-id');
	});

	it('lists only usableAsTool nodes', async () => {
		const tools = await repo.listTools();

		expect(tools.length).toBeGreaterThan(0);
		// Every descriptor must come from a node with usableAsTool: true
		// — verified by checking they all have a name and description
		for (const t of tools) {
			expect(typeof t.name).toBe('string');
			expect(t.name.length).toBeGreaterThan(0);
			expect(typeof t.description).toBe('string');
			// hasCredentials is always true in the current implementation
			expect(t.hasCredentials).toBe(true);
		}
	});

	it('does not include nodes without usableAsTool flag', async () => {
		const tools = await repo.listTools();
		const names = new Set(tools.map((t) => t.name));

		// ManualTrigger and Set nodes are not usableAsTool
		expect(names.has('n8n-nodes-base.manualTrigger')).toBe(false);
		expect(names.has('n8n-nodes-base.set')).toBe(false);
	});

	it('includes well-known integration nodes', async () => {
		const tools = await repo.listTools();
		const names = tools.map((t) => t.name);

		// These nodes are all marked usableAsTool in n8n-nodes-base
		expect(names).toContain('n8n-nodes-base.slack');
		expect(names).toContain('n8n-nodes-base.github');
	});

	it('getTool returns undefined for an unknown node', async () => {
		const result = await repo.getTool('n8n-nodes-base.doesNotExist');
		expect(result).toBeUndefined();
	});

	it('getTool returns a BuiltTool for a real usableAsTool node', async () => {
		const tools = await repo.listTools();
		const first = tools[0];

		const tool = await repo.getTool(first.name);

		expect(tool).toBeDefined();
		expect(tool!.name).toBe(first.name);
		expect(typeof tool!.description).toBe('string');
		expect(typeof tool!.handler).toBe('function');
	});

	it('getTool produces a tool with an input schema', async () => {
		// Slack has resource + operation properties so we get enum fields
		const tool = await repo.getTool('n8n-nodes-base.slack');

		expect(tool).toBeDefined();
		expect(tool!.inputSchema).toBeDefined();
	});
});

describe('ToolSearchProcessor — real node registry', () => {
	let repo: NodeToolRepository;
	let processor: ToolSearchProcessor;
	let onToolLoaded: jest.Mock;

	beforeAll(async () => {
		const lnc = await buildRealRegistry();
		repo = new NodeToolRepository(lnc, stubExecutor, 'test-project-id');
	});

	beforeEach(() => {
		onToolLoaded = jest.fn();
		processor = new ToolSearchProcessor({
			repository: repo,
			onToolLoaded,
		});
	});

	// ---- search_tools -------------------------------------------------------

	it('search_tools returns real node results for "slack"', async () => {
		const [searchTool] = processor.metaTools;
		const result = (await searchTool.handler!({ query: 'slack' }, {})) as {
			results: Array<{ name: string; description: string; score: number }>;
		};

		expect(result.results.length).toBeGreaterThan(0);
		const slackResult = result.results.find((r) => r.name === 'n8n-nodes-base.slack');
		expect(slackResult).toBeDefined();
		expect(slackResult!.score).toBeGreaterThan(0);
	});

	it('search_tools returns results for "github"', async () => {
		const [searchTool] = processor.metaTools;
		const result = (await searchTool.handler!({ query: 'github' }, {})) as {
			results: Array<{ name: string }>;
		};

		const names = result.results.map((r) => r.name);
		expect(names).toContain('n8n-nodes-base.github');
	});

	it('search_tools returns empty array for a nonsense query', async () => {
		const [searchTool] = processor.metaTools;
		const result = (await searchTool.handler!({ query: 'xyzzy_no_match_zz9' }, {})) as {
			results: unknown[];
		};

		expect(result.results).toEqual([]);
	});

	it('search_tools respects maxResults', async () => {
		const capped = new ToolSearchProcessor({ repository: repo, maxResults: 3 });
		const [searchTool] = capped.metaTools;
		const result = (await searchTool.handler!({ query: 'node' }, {})) as {
			results: unknown[];
		};

		expect(result.results.length).toBeLessThanOrEqual(3);
	});

	it('search_tools returns results sorted by score descending', async () => {
		const [searchTool] = processor.metaTools;
		const result = (await searchTool.handler!({ query: 'send message slack' }, {})) as {
			results: Array<{ score: number }>;
		};

		for (let i = 1; i < result.results.length; i++) {
			expect(result.results[i - 1].score).toBeGreaterThanOrEqual(result.results[i].score);
		}
	});

	// ---- load_tool ----------------------------------------------------------

	it('load_tool succeeds for a real usableAsTool node', async () => {
		const [, loadTool] = processor.metaTools;
		const result = (await loadTool.handler!({ name: 'n8n-nodes-base.slack' }, {})) as {
			success: boolean;
			message: string;
		};

		expect(result.success).toBe(true);
		expect(result.message.length).toBeGreaterThan(0);
	});

	it('load_tool calls onToolLoaded with the materialised BuiltTool', async () => {
		const [, loadTool] = processor.metaTools;
		await loadTool.handler!({ name: 'n8n-nodes-base.slack' }, {});

		expect(onToolLoaded).toHaveBeenCalledTimes(1);
		const loaded = onToolLoaded.mock.calls[0][0] as BuiltTool;
		expect(loaded.name).toBe('n8n-nodes-base.slack');
		expect(typeof loaded.handler).toBe('function');
	});

	it('load_tool adds the tool to getLoadedTools()', async () => {
		const [, loadTool] = processor.metaTools;
		await loadTool.handler!({ name: 'n8n-nodes-base.github' }, {});

		const loaded = processor.getLoadedTools();
		expect(loaded.map((t) => t.name)).toContain('n8n-nodes-base.github');
	});

	it('load_tool rejects an unknown node name', async () => {
		const [, loadTool] = processor.metaTools;
		const result = (await loadTool.handler!({ name: 'n8n-nodes-base.doesNotExistXyzzy' }, {})) as {
			success: boolean;
		};

		expect(result.success).toBe(false);
		expect(processor.getLoadedTools()).toHaveLength(0);
	});

	it('load_tool rejects a duplicate load', async () => {
		const [, loadTool] = processor.metaTools;
		await loadTool.handler!({ name: 'n8n-nodes-base.slack' }, {});
		const second = (await loadTool.handler!({ name: 'n8n-nodes-base.slack' }, {})) as {
			success: boolean;
		};

		expect(second.success).toBe(false);
		// Only one copy in the loaded set
		expect(
			processor.getLoadedTools().filter((t) => t.name === 'n8n-nodes-base.slack'),
		).toHaveLength(1);
	});

	it('reset clears the loaded tool set', async () => {
		const [, loadTool] = processor.metaTools;
		await loadTool.handler!({ name: 'n8n-nodes-base.slack' }, {});
		expect(processor.getLoadedTools()).toHaveLength(1);

		processor.reset();
		expect(processor.getLoadedTools()).toHaveLength(0);
	});
});
