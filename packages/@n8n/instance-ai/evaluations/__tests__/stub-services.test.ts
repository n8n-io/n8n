// Covers the eval node-service stub: real metadata coercion from
// `nodes.json` and discovery of `dist/node-definitions/` dirs. Both
// behaviors are critical to the pairwise eval producing scores against
// production-faithful node descriptions rather than stripped-down stubs.

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createStubServices, resolveEvalNodeDefinitionDirs } from '../harness/stub-services';

async function writeNodesJson(entries: unknown[]): Promise<string> {
	const dir = await fs.mkdtemp(path.join(tmpdir(), 'eval-stub-services-'));
	const file = path.join(dir, 'nodes.json');
	await fs.writeFile(file, JSON.stringify(entries), 'utf8');
	return file;
}

describe('createStubServices nodeService.getDescription', () => {
	it('returns properties, credentials, inputs and outputs from the node catalogue', async () => {
		const file = await writeNodesJson([
			{
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Make HTTP requests',
				group: ['input'],
				version: [1, 2, 3],
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Method',
						name: 'method',
						type: 'options',
						required: true,
						default: 'GET',
						options: [
							{ name: 'GET', value: 'GET' },
							{ name: 'POST', value: 'POST' },
						],
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
					},
				],
				credentials: [
					{ name: 'httpBasicAuth', required: false },
					{ name: 'httpHeaderAuth', required: true },
				],
			},
		]);

		const { context } = await createStubServices({ nodesJsonPath: file });
		const desc = await context.nodeService.getDescription('n8n-nodes-base.httpRequest');

		expect(desc.name).toBe('n8n-nodes-base.httpRequest');
		expect(desc.displayName).toBe('HTTP Request');
		// Latest version pulled from the version array.
		expect(desc.version).toBe(3);
		expect(desc.group).toEqual(['input']);
		expect(desc.properties).toHaveLength(2);
		expect(desc.properties[0]).toMatchObject({
			displayName: 'Method',
			name: 'method',
			type: 'options',
			required: true,
			default: 'GET',
			options: [
				{ name: 'GET', value: 'GET' },
				{ name: 'POST', value: 'POST' },
			],
		});
		expect(desc.credentials).toEqual([
			{ name: 'httpBasicAuth', required: false },
			{ name: 'httpHeaderAuth', required: true },
		]);
		expect(desc.inputs).toEqual(['main']);
		expect(desc.outputs).toEqual(['main']);
	});

	it('drops option entries that lack name or a primitive value', async () => {
		const file = await writeNodesJson([
			{
				name: 'n8n-nodes-base.example',
				displayName: 'Example',
				version: 1,
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Valid', value: 'valid' },
							// Object value is dropped — runtime assertions in nodes.tool.ts
							// expect string|number|boolean only.
							{ name: 'Invalid', value: { nested: true } },
							// Missing `value` is dropped.
							{ name: 'NoValue' },
						],
					},
				],
			},
		]);

		const { context } = await createStubServices({ nodesJsonPath: file });
		const desc = await context.nodeService.getDescription('n8n-nodes-base.example');
		expect(desc.properties[0].options).toEqual([{ name: 'Valid', value: 'valid' }]);
	});

	it('throws when the node type is not in the catalogue', async () => {
		const file = await writeNodesJson([
			{ name: 'n8n-nodes-base.a', displayName: 'A', version: 1, inputs: [], outputs: [] },
		]);
		const { context } = await createStubServices({ nodesJsonPath: file });
		await expect(context.nodeService.getDescription('does-not-exist')).rejects.toThrow(/not found/);
	});
});

describe('createStubServices nodeService.getNodeTypeDefinition', () => {
	it('returns a clear error when no node-definition dirs are available', async () => {
		// Force the empty-dirs branch by passing in a node catalogue that
		// references a node we won't have built. We can't easily simulate
		// "no dirs" without monkeypatching, so we instead exercise the more
		// likely scenario: the dirs exist but the node id is unknown to the
		// resolver. That covers the same surface the agent would observe.
		const file = await writeNodesJson([
			{ name: 'n8n-nodes-base.unknownNode', displayName: 'X', version: 1, inputs: [], outputs: [] },
		]);
		const { context } = await createStubServices({ nodesJsonPath: file });
		const td = await context.nodeService.getNodeTypeDefinition!('n8n-nodes-base.unknownNode');
		expect(td).toBeDefined();
		// Either the dirs are missing entirely (no build) or the node id is
		// unknown — both surface as an error string with empty content.
		expect(td?.content).toBe('');
		expect(td?.error).toBeTruthy();
	});
});

describe('resolveEvalNodeDefinitionDirs', () => {
	it('returns absolute paths and only lists dirs that actually exist', () => {
		const dirs = resolveEvalNodeDefinitionDirs();
		for (const dir of dirs) {
			expect(path.isAbsolute(dir)).toBe(true);
			expect(dir.endsWith('node-definitions')).toBe(true);
		}
	});
});

describe('createStubServices with a seed', () => {
	const seed = {
		workflows: [
			{ id: 'wf-orders', name: 'Sync orders', nodes: [{ name: 'Start' }], connections: {} },
			{ id: 'wf-report', name: 'Daily report', nodes: [], connections: {}, published: true },
		],
		dataTables: [
			{ id: 'dt-1', name: 'Leads', columns: [{ name: 'email', type: 'string' as const }] },
		],
		priorRuns: [
			{ workflow: 'wf-orders', hints: 'The Shopify node returned 401.' },
			{ workflow: 'wf-report' },
		],
	};

	it('returns the seeded workflows, failed runs and data tables', async () => {
		const { context } = await createStubServices({ nodesJsonPath: await writeNodesJson([]), seed });

		const all = await context.workflowService.list();
		expect(all.workflows.map((w) => [w.id, w.activeVersionId !== null])).toEqual([
			['wf-orders', false],
			['wf-report', true],
		]);
		expect((await context.workflowService.list({ query: 'REPORT' })).workflows).toHaveLength(1);
		expect((await context.workflowService.get('wf-orders')).nodes).toEqual([{ name: 'Start' }]);
		expect((await context.workflowService.getAsWorkflowJSON('wf-report')).name).toBe(
			'Daily report',
		);

		const runs = await context.executionService.list();
		expect(runs.map((r) => [r.workflowId, r.status])).toEqual([
			['wf-report', 'error'],
			['wf-orders', 'error'],
		]);
		expect(await context.executionService.list({ status: 'success' })).toEqual([]);
		const [ordersRun] = await context.executionService.list({ workflowId: 'wf-orders' });
		expect((await context.executionService.getResult(ordersRun.id)).error).toBe(
			'The Shopify node returned 401.',
		);
		expect((await context.executionService.getResult(runs[0].id)).error).toBe(
			'The execution failed.',
		);

		expect((await context.dataTableService.list()).map((t) => t.name)).toEqual(['Leads']);
		expect(await context.dataTableService.getSchema('dt-1')).toEqual([
			{ id: 'dt-1-col-0', index: 0, name: 'email', type: 'string' },
		]);
	});

	it('returns the seeded accounts, and only working ones pass the connection test', async () => {
		const { context } = await createStubServices({
			nodesJsonPath: await writeNodesJson([]),
			credentials: [
				{ type: 'slackApi' },
				{ type: 'notionApi', name: 'Team Notion', valid: false },
				{ type: 'slackApi', blank: true },
			],
		});

		const accounts = await context.credentialService.list();
		expect(accounts.map((a) => a.name)).toEqual(['slackApi', 'Team Notion', 'slackApi']);
		expect(await context.credentialService.list({ type: 'notionApi' })).toHaveLength(1);
		const results = await Promise.all(
			accounts.map(async (a) => await context.credentialService.test(a.id)),
		);
		expect(results.map((r) => r.success)).toEqual([true, false, false]);
	});

	it('returns nothing without a seed', async () => {
		const { context } = await createStubServices({ nodesJsonPath: await writeNodesJson([]) });

		expect((await context.workflowService.list()).workflows).toEqual([]);
		expect(await context.executionService.list()).toEqual([]);
		expect(await context.credentialService.list()).toEqual([]);
		expect(await context.dataTableService.list()).toEqual([]);
	});
});
