import type { IConnections, INode } from 'n8n-workflow';

import { createNode } from '../../__tests__/test-helpers';
import { executeWorkflowEachToLoop } from '../execute-workflow-each-to-loop.migration';

const EXECUTE_WORKFLOW = 'n8n-nodes-base.executeWorkflow';
const LOOP = 'n8n-nodes-base.splitInBatches';

const edge = (node: string, index = 0) => ({ node, type: 'main' as const, index });

const migrate = (nodes: INode[], connections: IConnections, affected: INode[]) =>
	executeWorkflowEachToLoop.migrateWorkflow({
		nodes,
		connections,
		affectedNodeIds: new Set(affected.map((n) => n.id)),
	});

describe('executeWorkflowEachToLoop migration', () => {
	it('is keyed by the each-mode rule id', () => {
		expect(executeWorkflowEachToLoop.ruleId).toBe('execute-workflow-each-mode-v3');
	});

	it('wraps a flagged node in a Loop Over Items on a linear chain', () => {
		const trigger = createNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const sub = createNode('Sub', EXECUTE_WORKFLOW, { mode: 'each', workflowId: 'abc' });
		sub.position = [400, 200];
		const set = createNode('Set', 'n8n-nodes-base.set');
		const connections: IConnections = {
			Trigger: { main: [[edge('Sub')]] },
			Sub: { main: [[edge('Set')]] },
		};

		const result = migrate([trigger, sub, set], connections, [sub]);

		// The loop is inserted right before the node it wraps.
		expect(result.nodes.map((n) => n.name)).toEqual(['Trigger', 'Loop Over Items', 'Sub', 'Set']);
		const loop = result.nodes[1];
		expect(loop).toMatchObject({
			type: LOOP,
			typeVersion: 3,
			parameters: { batchSize: 1, options: {} },
			position: [400, 200],
		});
		expect(loop.id).toEqual(expect.any(String));
		// The sub-workflow node switches mode, keeps its identity, and moves into the loop body.
		const migratedSub = result.nodes[2];
		expect(migratedSub).toMatchObject({
			id: sub.id,
			name: 'Sub',
			type: EXECUTE_WORKFLOW,
			parameters: { mode: 'once', workflowId: 'abc' },
			position: [640, 380],
		});

		expect(result.connections).toEqual({
			Trigger: { main: [[edge('Loop Over Items')]] },
			'Loop Over Items': { main: [[edge('Set')], [edge('Sub')]] },
			Sub: { main: [[edge('Loop Over Items')]] },
		});
		expect(result.migratedNodeIds).toEqual([sub.id]);
		expect(result.notes).toBeUndefined();
		expect(result.unmapped).toBeUndefined();
	});

	it('does not mutate its input', () => {
		const trigger = createNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const sub = createNode('Sub', EXECUTE_WORKFLOW, { mode: 'each' });
		const nodes = [trigger, sub];
		const connections: IConnections = { Trigger: { main: [[edge('Sub')]] } };
		const nodesSnapshot = structuredClone(nodes);
		const connectionsSnapshot = structuredClone(connections);

		migrate(nodes, connections, [sub]);

		expect(nodes).toEqual(nodesSnapshot);
		expect(connections).toEqual(connectionsSnapshot);
	});

	it('handles several predecessors and several successors', () => {
		const a = createNode('A', 'n8n-nodes-base.set');
		const b = createNode('B', 'n8n-nodes-base.set');
		const sub = createNode('Sub', EXECUTE_WORKFLOW, { mode: 'each' });
		const c = createNode('C', 'n8n-nodes-base.set');
		const d = createNode('D', 'n8n-nodes-base.set');
		const connections: IConnections = {
			A: { main: [[edge('Sub')]] },
			B: { main: [[edge('Sub'), edge('C')]] },
			Sub: { main: [[edge('C'), edge('D', 1)]] },
		};

		const result = migrate([a, b, sub, c, d], connections, [sub]);

		expect(result.connections).toEqual({
			A: { main: [[edge('Loop Over Items')]] },
			// B's edge to C is unrelated and stays.
			B: { main: [[edge('Loop Over Items'), edge('C')]] },
			'Loop Over Items': { main: [[edge('C'), edge('D', 1)], [edge('Sub')]] },
			Sub: { main: [[edge('Loop Over Items')]] },
		});
	});

	it('wraps a flagged node that has no successors', () => {
		const trigger = createNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const sub = createNode('Sub', EXECUTE_WORKFLOW, { mode: 'each' });
		const connections: IConnections = { Trigger: { main: [[edge('Sub')]] } };

		const result = migrate([trigger, sub], connections, [sub]);

		expect(result.connections).toEqual({
			Trigger: { main: [[edge('Loop Over Items')]] },
			'Loop Over Items': { main: [[], [edge('Sub')]] },
			Sub: { main: [[edge('Loop Over Items')]] },
		});
	});

	it('gives each wrapped node its own uniquely named loop and skips unaffected nodes', () => {
		const existingLoop = createNode('Loop Over Items', LOOP);
		const first = createNode('First', EXECUTE_WORKFLOW, { mode: 'each' });
		const second = createNode('Second', EXECUTE_WORKFLOW, { mode: 'each' });
		const untouched = createNode('Untouched', EXECUTE_WORKFLOW, { mode: 'once' });
		// First (each) → Second (each) → Untouched (once)
		const connections: IConnections = {
			First: { main: [[edge('Second')]] },
			Second: { main: [[edge('Untouched')]] },
		};

		const result = migrate([existingLoop, first, second, untouched], connections, [first, second]);

		expect(result.nodes.map((n) => n.name)).toEqual([
			'Loop Over Items',
			'Loop Over Items1',
			'First',
			'Loop Over Items2',
			'Second',
			'Untouched',
		]);
		expect(result.nodes.find((n) => n.name === 'Untouched')).toBe(untouched);
		expect(result.connections).toEqual({
			'Loop Over Items1': { main: [[edge('Loop Over Items2')], [edge('First')]] },
			First: { main: [[edge('Loop Over Items1')]] },
			'Loop Over Items2': { main: [[edge('Untouched')], [edge('Second')]] },
			Second: { main: [[edge('Loop Over Items2')]] },
		});
		expect(result.migratedNodeIds).toEqual([first.id, second.id]);
	});

	it('keeps the error output wired and warns that failed items leave the loop', () => {
		const sub = createNode('Sub', EXECUTE_WORKFLOW, { mode: 'each' });
		sub.onError = 'continueErrorOutput';
		const ok = createNode('Ok', 'n8n-nodes-base.set');
		const failed = createNode('Failed', 'n8n-nodes-base.set');
		const connections: IConnections = {
			Sub: { main: [[edge('Ok')], [edge('Failed')]] },
		};

		const result = migrate([sub, ok, failed], connections, [sub]);

		expect(result.connections.Sub).toEqual({
			main: [[edge('Loop Over Items')], [edge('Failed')]],
		});
		expect(result.connections['Loop Over Items']).toEqual({ main: [[edge('Ok')], [edge('Sub')]] });
		expect(result.notes).toEqual([expect.stringContaining('error output')]);
	});

	it('warns when "Execute Once" is enabled on the wrapped node', () => {
		const sub = createNode('Sub', EXECUTE_WORKFLOW, { mode: 'each' });
		sub.executeOnce = true;

		const result = migrate([sub], {}, [sub]);

		expect(result.notes).toEqual([expect.stringContaining('Execute Once')]);
	});

	it('warns when other nodes read the wrapped node by name in expressions', () => {
		const sub = createNode('Sub WF', EXECUTE_WORKFLOW, { mode: 'each' });
		const reader = createNode('Reader', 'n8n-nodes-base.set', {
			assignments: { assignments: [{ value: "={{ $('Sub WF').all().length }}" }] },
		});
		const legacyReader = createNode('Legacy', 'n8n-nodes-base.set', {
			value: '={{ $node["Sub WF"].json.x }}',
		});
		const unrelated = createNode('Unrelated', 'n8n-nodes-base.set', {
			value: "={{ $('Other').item.json.x }}",
		});

		const result = migrate([sub, reader, legacyReader, unrelated], {}, [sub]);

		expect(result.notes).toEqual([
			expect.stringContaining('"Reader", "Legacy" reference "Sub WF"'),
		]);
	});
});
