import type { INodeTypeDescription } from 'n8n-workflow';

import type { BinaryCheckContext } from '../../types';
import { allNodesConnected } from '../all-nodes-connected';
import { hasNodes } from '../has-nodes';
import { hasStartNode } from '../has-start-node';
import { hasTrigger } from '../has-trigger';
import { noEmptySetNodes } from '../no-empty-set-nodes';
import { noHardcodedCredentials } from '../no-hardcoded-credentials';
import { noUnnecessaryCodeNodes } from '../no-unnecessary-code-nodes';
import { noUnreachableNodes } from '../no-unreachable-nodes';

// Minimal trigger node type for tests
const triggerNodeType: INodeTypeDescription = {
	displayName: 'Manual Trigger',
	name: 'n8n-nodes-base.manualTrigger',
	group: ['trigger'],
	version: 1,
	defaults: { name: 'When clicking' },
	inputs: [],
	outputs: ['main'],
	description: 'Manual trigger',
	properties: [],
};

const regularNodeType: INodeTypeDescription = {
	displayName: 'Set',
	name: 'n8n-nodes-base.set',
	group: ['transform'],
	version: [3, 3.2, 3.4],
	defaults: { name: 'Edit Fields' },
	inputs: ['main'],
	outputs: ['main'],
	description: 'Set fields',
	properties: [],
};

const codeNodeType: INodeTypeDescription = {
	displayName: 'Code',
	name: 'n8n-nodes-base.code',
	group: ['transform'],
	version: 1,
	defaults: { name: 'Code' },
	inputs: ['main'],
	outputs: ['main'],
	description: 'Custom code',
	properties: [],
};

const nodeTypes: INodeTypeDescription[] = [triggerNodeType, regularNodeType, codeNodeType];

function makeCtx(overrides?: Partial<BinaryCheckContext>): BinaryCheckContext {
	return { prompt: 'test', nodeTypes, ...overrides };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper, partial INode is fine
function makeWorkflow(partial: Record<string, any>) {
	return { name: 'test', nodes: [], connections: {}, ...partial };
}

describe('has_nodes', () => {
	it('passes when workflow has nodes', async () => {
		const result = await hasNodes.run(
			makeWorkflow({
				nodes: [{ name: 'A', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when workflow has no nodes', async () => {
		const result = await hasNodes.run(makeWorkflow({ nodes: [] }), makeCtx());
		expect(result.pass).toBe(false);
		expect(result.comment).toBeDefined();
	});
});

describe('has_trigger', () => {
	it('passes when trigger node exists', async () => {
		const result = await hasTrigger.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when no trigger node', async () => {
		const result = await hasTrigger.run(
			makeWorkflow({
				nodes: [{ name: 'A', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
	});
});

describe('all_nodes_connected', () => {
	it('passes when empty workflow', async () => {
		const result = await allNodesConnected.run(makeWorkflow({}), makeCtx());
		expect(result.pass).toBe(true);
	});

	it('fails for single disconnected node', async () => {
		const result = await allNodesConnected.run(
			makeWorkflow({
				nodes: [{ name: 'Orphan', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
				connections: {},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Orphan');
	});

	it('passes when all nodes are connected', async () => {
		const result = await allNodesConnected.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('ignores sticky notes when checking connectivity', async () => {
		const result = await allNodesConnected.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
					{
						name: 'Note',
						type: 'n8n-nodes-base.stickyNote',
						typeVersion: 1,
						position: [400, 200],
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when one node is disconnected', async () => {
		const result = await allNodesConnected.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
					{ name: 'Orphan', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Orphan');
	});
});

describe('no_unreachable_nodes', () => {
	it('passes when empty workflow', async () => {
		const result = await noUnreachableNodes.run(makeWorkflow({}), makeCtx());
		expect(result.pass).toBe(true);
	});

	it('fails when no trigger exists (all nodes unreachable)', async () => {
		const result = await noUnreachableNodes.run(
			makeWorkflow({
				nodes: [{ name: 'A', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('No trigger found');
	});

	it('passes when all nodes reachable from trigger', async () => {
		const result = await noUnreachableNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when node is not reachable from trigger', async () => {
		const result = await noUnreachableNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
					{ name: 'Orphan', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Orphan');
	});
});

describe('no_empty_set_nodes', () => {
	it('passes when no Set nodes', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{ name: 'A', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0] },
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('passes with v3 assignments format', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [{ name: 'field', value: 'val', type: 'string' }],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('passes with v2 fields.values format', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.2,
						position: [0, 0],
						parameters: {
							fields: {
								values: [{ name: 'text', stringValue: '={{ $json.text }}' }],
							},
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when Set node has no assignments in either format', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Empty Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0],
						parameters: {},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Empty Set');
	});

	it('fails when assignments array is empty', async () => {
		const result = await noEmptySetNodes.run(
			makeWorkflow({
				nodes: [
					{
						name: 'EmptyAssign',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [0, 0],
						parameters: {
							assignments: { assignments: [] },
						},
					},
				],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
	});
});

describe('no_hardcoded_credentials', () => {
	it('passes when no hardcoded credentials', async () => {
		const result = await noHardcodedCredentials.run(
			makeWorkflow({
				nodes: [{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});
});

describe('no_unnecessary_code_nodes', () => {
	it('passes when no code nodes', async () => {
		const result = await noUnnecessaryCodeNodes.run(
			makeWorkflow({
				nodes: [{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when code node exists without annotation', async () => {
		const result = await noUnnecessaryCodeNodes.run(
			makeWorkflow({
				nodes: [{ name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 1, position: [0, 0] }],
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Code');
	});

	it('passes when code node exists with code_necessary annotation', async () => {
		const result = await noUnnecessaryCodeNodes.run(
			makeWorkflow({
				nodes: [{ name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 1, position: [0, 0] }],
			}),
			makeCtx({ annotations: { code_necessary: true } }),
		);
		expect(result.pass).toBe(true);
	});
});

describe('has_start_node', () => {
	it('fails when workflow has no nodes', async () => {
		const result = await hasStartNode.run(makeWorkflow({}), makeCtx());
		expect(result.pass).toBe(false);
	});

	it('passes when trigger has downstream node', async () => {
		const result = await hasStartNode.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [200, 0] },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(true);
	});

	it('fails when trigger has no downstream node', async () => {
		const result = await hasStartNode.run(
			makeWorkflow({
				nodes: [
					{
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			}),
			makeCtx(),
		);
		expect(result.pass).toBe(false);
	});
});
