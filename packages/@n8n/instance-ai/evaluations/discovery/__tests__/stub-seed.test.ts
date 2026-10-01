// The stub instance with and without a seed: seeded reads return the seeded
// state, and an unseeded stub keeps its empty answers.

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createStubServices } from '../../harness/stub-services';
import { createStubAgentContextReader } from '../stub-agent-context';

async function nodesJsonPath(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(tmpdir(), 'eval-stub-seed-'));
	const file = path.join(dir, 'nodes.json');
	await fs.writeFile(file, JSON.stringify([]), 'utf8');
	return file;
}

const seed = {
	workflows: [
		{
			id: 'wf-lead-enrich-01',
			name: 'Lead enrichment',
			nodes: [
				{ name: 'New lead', type: 'n8n-nodes-base.webhook' },
				{ name: 'Enrich lead', type: 'n8n-nodes-base.httpRequest', position: [220, 0] },
			],
			connections: {
				'New lead': { main: [[{ node: 'Enrich lead', type: 'main', index: 0 }]] },
			},
		},
		{ id: 'wf-other-0001', name: 'Weekly report', nodes: [], connections: {}, published: true },
	],
	dataTables: [
		{ id: 'dt-leads-0001', name: 'Leads', columns: [{ name: 'email', type: 'string' as const }] },
	],
	priorRuns: [
		{ workflow: 'wf-lead-enrich-01', hints: 'Enrich lead: 401 Unauthorized' },
		{ workflow: 'wf-lead-enrich-01' },
	],
};

describe('createStubServices without a seed', () => {
	it('keeps the empty instance', async () => {
		const { context } = await createStubServices({ nodesJsonPath: await nodesJsonPath() });

		expect(await context.workflowService.list()).toEqual({
			workflows: [],
			total: 0,
			totalInScope: 0,
		});
		expect((await context.workflowService.get('any-id')).nodes).toEqual([]);
		expect(await context.executionService.list()).toEqual([]);
		expect((await context.executionService.getStatus('seed-exec-1')).error).toBe(
			'stub: execution disabled in eval',
		);
		expect(await context.dataTableService.list()).toEqual([]);
	});
});

describe('createStubServices with a seed', () => {
	it('returns the seeded workflows from list, get, and the JSON read', async () => {
		const { context } = await createStubServices({ nodesJsonPath: await nodesJsonPath(), seed });

		const all = await context.workflowService.list();
		expect(all.workflows.map((w) => w.name)).toEqual(['Lead enrichment', 'Weekly report']);
		expect(all.workflows[1].activeVersionId).not.toBeNull();

		const filtered = await context.workflowService.list({ query: 'lead' });
		expect(filtered.workflows.map((w) => w.id)).toEqual(['wf-lead-enrich-01']);
		expect(filtered).toMatchObject({ total: 1, totalInScope: 2 });

		const detail = await context.workflowService.get('wf-lead-enrich-01');
		expect(detail.name).toBe('Lead enrichment');
		expect(detail.nodes.map((n) => n.name)).toEqual(['New lead', 'Enrich lead']);

		const json = await context.workflowService.getAsWorkflowJSON('wf-lead-enrich-01');
		expect(json.nodes[0]).toMatchObject({ id: 'seed-node-0', typeVersion: 1, position: [0, 0] });
		expect(json.nodes[1].position).toEqual([220, 0]);
		expect(json.connections).toEqual(seed.workflows[0].connections);
	});

	it('keeps an edit to a seeded workflow', async () => {
		const { context } = await createStubServices({ nodesJsonPath: await nodesJsonPath(), seed });
		const edited = await context.workflowService.getAsWorkflowJSON('wf-lead-enrich-01');

		await context.workflowService.updateFromWorkflowJSON('wf-lead-enrich-01', {
			...edited,
			name: 'Lead enrichment v2',
		});

		expect((await context.workflowService.get('wf-lead-enrich-01')).name).toBe(
			'Lead enrichment v2',
		);
	});

	it('reports each prior run as a failed execution with the hints as the error', async () => {
		const { context } = await createStubServices({ nodesJsonPath: await nodesJsonPath(), seed });

		const listed = await context.executionService.list({ workflowId: 'wf-lead-enrich-01' });
		expect(listed.map((e) => e.id)).toEqual(['seed-exec-2', 'seed-exec-1']);
		expect(listed.every((e) => e.status === 'error' && e.workflowName === 'Lead enrichment')).toBe(
			true,
		);
		expect(Date.parse(listed[0].startedAt)).toBeGreaterThan(Date.parse(listed[1].startedAt));
		expect(await context.executionService.list({ status: 'success' })).toEqual([]);
		expect(await context.executionService.list({ workflowId: 'wf-other-0001' })).toEqual([]);

		const status = await context.executionService.getStatus('seed-exec-1');
		expect(status).toMatchObject({
			status: 'error',
			error: 'Enrich lead: 401 Unauthorized',
			lastNodeExecuted: 'Enrich lead',
		});

		const debug = await context.executionService.getDebugInfo('seed-exec-1');
		expect(debug.failedNode).toEqual({
			name: 'Enrich lead',
			type: 'n8n-nodes-base.httpRequest',
			error: 'Enrich lead: 401 Unauthorized',
		});
		expect(debug.nodeTrace.map((n) => n.status)).toEqual(['error']);

		const withoutHints = await context.executionService.getDebugInfo('seed-exec-2');
		expect(withoutHints.error).toBe('The execution failed.');
		expect(withoutHints.failedNode).toBeUndefined();
	});

	it('returns the seeded data tables and their columns', async () => {
		const { context } = await createStubServices({ nodesJsonPath: await nodesJsonPath(), seed });

		expect((await context.dataTableService.list()).map((t) => t.name)).toEqual(['Leads']);
		expect(await context.dataTableService.getSchema('dt-leads-0001')).toEqual([
			{ id: 'dt-leads-0001-col-0', name: 'email', type: 'string', index: 0 },
		]);
		expect(await context.dataTableService.getSchema('dt-unknown')).toEqual([]);
	});
});

describe('createStubAgentContextReader', () => {
	const reader = createStubAgentContextReader(
		[
			{
				id: 'agent-support-01',
				config: {
					name: 'Support bot',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Answer order questions.',
				},
			},
		],
		'2026-09-30T00:00:00.000Z',
	);

	it('lists the seeded Agents and returns a config', async () => {
		expect(await reader.lookup({ type: 'agents' })).toEqual({
			agents: [
				{
					agentId: 'agent-support-01',
					name: 'Support bot',
					published: false,
					updatedAt: '2026-09-30T00:00:00.000Z',
				},
			],
		});
		expect(await reader.lookup({ type: 'config', agentId: 'agent-support-01' })).toMatchObject({
			configState: 'current-draft',
			config: { model: 'anthropic/claude-sonnet-4-5' },
		});
		expect(await reader.lookup({ type: 'config-schema' })).toHaveProperty('configurableProperties');
	});

	it('fails for an unknown Agent and for lookups with no seeded data', async () => {
		await expect(reader.lookup({ type: 'config', agentId: 'agent-missing' })).rejects.toThrow(
			'Agent not found.',
		);
		await expect(reader.lookup({ type: 'capabilities' })).rejects.toThrow('not available');
	});
});
