import type { IConnection, INode, IWorkflowBase } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
	UnsupportedConnectionTypeError,
	UnsupportedCycleError,
	UnsupportedTriggerError,
	UnsupportedLoopEntryError,
	UnsupportedWorkflowError,
} from '../errors';
import { V1WorkflowConverter } from '../v1-workflow-converter';

const converter = new V1WorkflowConverter();

const manualTrigger: INode = {
	id: 'trigger-uuid',
	name: 'When clicking Execute',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const node = (id: string, name: string, extra: Partial<INode> = {}): INode => ({
	id,
	name,
	type: 'n8n-nodes-base.noOp',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...extra,
});

const main = (target: string, index = 0): IConnection => ({ node: target, type: 'main', index });

function workflow(overrides: Partial<IWorkflowBase>): IWorkflowBase {
	return {
		id: 'wf-1',
		name: 'Test workflow',
		active: false,
		isArchived: false,
		nodes: [],
		connections: {},
		settings: {},
		...overrides,
	} as IWorkflowBase;
}

// NOTE: Topology diagrams follow the convention of core's partial-execution
// tests (drawn with https://asciiflow.com/#/). If you update a test, update
// its diagram.
//
// oN / iN  the output / input slot, where it matters
// XX       the node is disabled
// (back)   the loop-return edge expected to be marked `isBackEdge`
describe('V1WorkflowConverter', () => {
	describe('trigger nodes', () => {
		it('maps a manual trigger to a single trigger graph node', () => {
			const graph = converter.convert(
				workflow({
					nodes: [
						{
							id: 'node-uuid-1',
							name: 'When clicking Execute',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
				}),
			);

			expect(graph.nodes).toEqual([
				{ id: 'node-uuid-1', name: 'When clicking Execute', type: 'trigger' },
			]);
			expect(graph.edges).toEqual([]);
		});
	});

	describe('v1 nodes', () => {
		it('maps a regular node to a v1-node step carrying its config', () => {
			const graph = converter.convert(
				workflow({
					nodes: [
						manualTrigger,
						{
							id: 'set-uuid',
							name: 'Edit Fields',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [200, 0],
							parameters: { mode: 'manual', includeOtherFields: true },
							continueOnFail: true,
						},
					],
				}),
			);

			expect(graph.nodes).toContainEqual({
				id: 'set-uuid',
				name: 'Edit Fields',
				type: 'v1-node',
				config: {
					nodeType: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					parameters: { mode: 'manual', includeOtherFields: true },
					continueOnFail: true,
				},
			});
		});

		it('defaults continueOnFail to false when the node omits it', () => {
			const graph = converter.convert(
				workflow({
					nodes: [
						manualTrigger,
						{
							id: 'noop-uuid',
							name: 'No Operation',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
					],
				}),
			);

			const noOp = graph.nodes.find((n) => n.id === 'noop-uuid');
			expect(noOp?.config).toMatchObject({ continueOnFail: false });
		});
	});

	describe('unsupported constructs', () => {
		it('rejects a non-manual trigger with a clear error', () => {
			expect(() =>
				converter.convert(
					workflow({
						nodes: [
							{
								id: 'webhook-uuid',
								name: 'Webhook',
								type: 'n8n-nodes-base.webhook',
								typeVersion: 2,
								position: [0, 0],
								parameters: {},
							},
						],
					}),
				),
			).toThrow(UnsupportedTriggerError);
		});

		it('rejects a schedule trigger (type ending in "Trigger")', () => {
			expect(() =>
				converter.convert(
					workflow({
						nodes: [
							{
								id: 'sched-uuid',
								name: 'Schedule Trigger',
								type: 'n8n-nodes-base.scheduleTrigger',
								typeVersion: 1,
								position: [0, 0],
								parameters: {},
							},
						],
					}),
				),
			).toThrow(UnsupportedTriggerError);
		});

		const mergeNode = (parameters: INode['parameters']): INode =>
			node('merge-uuid', 'Merge', { type: 'n8n-nodes-base.merge', typeVersion: 3.2, parameters });

		it('rejects a Merge in chooseBranch mode', () => {
			expect(() =>
				converter.convert(
					workflow({ nodes: [manualTrigger, mergeNode({ mode: 'chooseBranch' })] }),
				),
			).toThrow(UnsupportedWorkflowError);
		});

		it.each([2.1, 3.2])('rejects a Merge v%s whose mode is an expression', (typeVersion) => {
			// unknowable at conversion time; v3's noDataExpression only binds the
			// UI, so a hand-authored workflow can still carry one
			expect(() =>
				converter.convert(
					workflow({
						nodes: [manualTrigger, { ...mergeNode({ mode: '={{ $json.mode }}' }), typeVersion }],
					}),
				),
			).toThrow(UnsupportedWorkflowError);
		});

		it('accepts a Merge in a literal non-chooseBranch mode', () => {
			expect(() =>
				converter.convert(workflow({ nodes: [manualTrigger, mergeNode({ mode: 'append' })] })),
			).not.toThrow();
		});

		it('accepts an expression mode on Merge v1, which predates chooseBranch', () => {
			expect(() =>
				converter.convert(
					workflow({
						nodes: [manualTrigger, { ...mergeNode({ mode: "={{ 'append' }}" }), typeVersion: 1 }],
					}),
				),
			).not.toThrow();
		});
	});

	describe('edges', () => {
		it('maps connections to id-keyed edges with slot indexes', () => {
			// ┌───────┐    ┌─┐
			// │trigger├───►│A│
			// └───────┘    └─┘
			const graph = converter.convert(
				workflow({
					nodes: [manualTrigger, node('a-uuid', 'A')],
					connections: { 'When clicking Execute': { main: [[main('A')]] } },
				}),
			);

			expect(graph.edges).toEqual([
				{ from: 'trigger-uuid', to: 'a-uuid', outputIndex: 0, inputIndex: 0 },
			]);
		});

		it('maps multi-output sources to distinct output slots', () => {
			// ┌───────┐    ┌──┐ o0    ┌─┐
			// │trigger├───►│  ├──────►│A│
			// └───────┘    │IF│       └─┘
			//              │  │ o1    ┌─┐
			//              │  ├──────►│B│
			//              └──┘       └─┘
			const graph = converter.convert(
				workflow({
					nodes: [manualTrigger, node('if-uuid', 'IF'), node('a-uuid', 'A'), node('b-uuid', 'B')],
					connections: {
						'When clicking Execute': { main: [[main('IF')]] },
						IF: { main: [[main('A')], [main('B')]] },
					},
				}),
			);

			expect(graph.edges).toContainEqual({
				from: 'if-uuid',
				to: 'a-uuid',
				outputIndex: 0,
				inputIndex: 0,
			});
			expect(graph.edges).toContainEqual({
				from: 'if-uuid',
				to: 'b-uuid',
				outputIndex: 1,
				inputIndex: 0,
			});
		});

		it('maps multi-input targets to distinct input slots', () => {
			// ┌─┐       i0 ┌─────┐
			// │A├─────────►│     │
			// └─┘          │Merge│
			// ┌─┐       i1 │     │
			// │B├─────────►│     │
			// └─┘          └─────┘
			const graph = converter.convert(
				workflow({
					nodes: [node('a-uuid', 'A'), node('b-uuid', 'B'), node('merge-uuid', 'Merge')],
					connections: {
						A: { main: [[main('Merge', 0)]] },
						B: { main: [[main('Merge', 1)]] },
					},
				}),
			);

			expect(graph.edges).toEqual([
				{ from: 'a-uuid', to: 'merge-uuid', outputIndex: 0, inputIndex: 0 },
				{ from: 'b-uuid', to: 'merge-uuid', outputIndex: 0, inputIndex: 1 },
			]);
		});

		it('leaves rootless nodes unconnected', () => {
			const graph = converter.convert(
				workflow({ nodes: [manualTrigger, node('orphan-uuid', 'Orphan')], connections: {} }),
			);

			expect(graph.nodes).toHaveLength(2);
			expect(graph.edges).toEqual([]);
		});

		it('drops connections referencing missing nodes', () => {
			// ┌─────┐    ┌─┐     ┌───────┐    ┌─────────────┐
			// │Ghost├───►│A│     │trigger├───►│Another Ghost│
			// └─────┘    └─┘     └───────┘    └─────────────┘
			// neither ghost exists as a node
			const graph = converter.convert(
				workflow({
					nodes: [manualTrigger, node('a-uuid', 'A')],
					connections: {
						Ghost: { main: [[main('A')]] },
						'When clicking Execute': { main: [[main('Another Ghost')]] },
					},
				}),
			);

			expect(graph.edges).toEqual([]);
		});

		it('rejects non-main connection types', () => {
			expect(() =>
				converter.convert(
					workflow({
						nodes: [node('tool-uuid', 'Tool'), node('agent-uuid', 'Agent')],
						connections: {
							Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
						},
					}),
				),
			).toThrow(UnsupportedConnectionTypeError);
		});
	});

	describe('disabled nodes', () => {
		it('splices out a disabled node, keeping the outer slot indexes', () => {
			//                              XX
			// ┌───────┐    ┌─┐ o1     ┌────────┐     i2 ┌─┐
			// │trigger├───►│A├───────►│Disabled├───────►│S│
			// └───────┘    └─┘        └────────┘        └─┘
			const graph = converter.convert(
				workflow({
					nodes: [
						manualTrigger,
						node('a-uuid', 'A'),
						node('d-uuid', 'Disabled', { disabled: true }),
						node('s-uuid', 'S'),
					],
					connections: {
						'When clicking Execute': { main: [[main('A')]] },
						A: { main: [[], [main('Disabled')]] },
						Disabled: { main: [[main('S', 2)]] },
					},
				}),
			);

			expect(graph.nodes.map((n) => n.id)).toEqual(['trigger-uuid', 'a-uuid', 's-uuid']);
			expect(graph.edges).toContainEqual({
				from: 'a-uuid',
				to: 's-uuid',
				outputIndex: 1,
				inputIndex: 2,
			});
			expect(graph.edges).toHaveLength(2);
		});

		it('splices chained disabled nodes transitively', () => {
			//            XX       XX
			// ┌─┐       ┌──┐     ┌──┐     ┌─┐
			// │A├──────►│D1├────►│D2├────►│B│
			// └─┘       └──┘     └──┘     └─┘
			const graph = converter.convert(
				workflow({
					nodes: [
						node('a-uuid', 'A'),
						node('d1-uuid', 'D1', { disabled: true }),
						node('d2-uuid', 'D2', { disabled: true }),
						node('b-uuid', 'B'),
					],
					connections: {
						A: { main: [[main('D1')]] },
						D1: { main: [[main('D2')]] },
						D2: { main: [[main('B')]] },
					},
				}),
			);

			expect(graph.edges).toEqual([
				{ from: 'a-uuid', to: 'b-uuid', outputIndex: 0, inputIndex: 0 },
			]);
		});

		it('fans out the splice as a cross-product', () => {
			//              XX
			// ┌──┐       ┌────────┐     ┌──┐
			// │P1├──────►│        ├────►│S1│
			// └──┘       │Disabled│     └──┘
			// ┌──┐       │        │     ┌──┐
			// │P2├──────►│        ├────►│S2│
			// └──┘       └────────┘     └──┘
			const graph = converter.convert(
				workflow({
					nodes: [
						node('p1-uuid', 'P1'),
						node('p2-uuid', 'P2'),
						node('d-uuid', 'Disabled', { disabled: true }),
						node('s1-uuid', 'S1'),
						node('s2-uuid', 'S2'),
					],
					connections: {
						P1: { main: [[main('Disabled')]] },
						P2: { main: [[main('Disabled')]] },
						Disabled: { main: [[main('S1'), main('S2')]] },
					},
				}),
			);

			expect(graph.edges).toHaveLength(4);
			for (const from of ['p1-uuid', 'p2-uuid']) {
				for (const to of ['s1-uuid', 's2-uuid']) {
					expect(graph.edges).toContainEqual({ from, to, outputIndex: 0, inputIndex: 0 });
				}
			}
		});

		it('dedupes identical edges created by the splice', () => {
			//             XX
			//            ┌──┐
			//       ┌───►│D1├────┐
			// ┌─┐   │    └──┘    │   ┌─┐
			// │A├───┤     XX     ├──►│S│
			// └─┘   │    ┌──┐    │   └─┘
			//       └───►│D2├────┘
			//            └──┘
			const graph = converter.convert(
				workflow({
					nodes: [
						node('a-uuid', 'A'),
						node('d1-uuid', 'D1', { disabled: true }),
						node('d2-uuid', 'D2', { disabled: true }),
						node('s-uuid', 'S'),
					],
					connections: {
						A: { main: [[main('D1'), main('D2')]] },
						D1: { main: [[main('S')]] },
						D2: { main: [[main('S')]] },
					},
				}),
			);

			expect(graph.edges).toEqual([
				{ from: 'a-uuid', to: 's-uuid', outputIndex: 0, inputIndex: 0 },
			]);
		});

		it('drops predecessors feeding input slots other than 0, matching v1 pass-through', () => {
			//                  XX
			// ┌─┐       i0    ┌─────┐
			// │A├────────────►│     │     ┌─┐
			// └─┘             │Merge├────►│S│
			// ┌─┐       i1    │     │     └─┘
			// │B├────────────►│     │
			// └─┘             └─────┘
			const graph = converter.convert(
				workflow({
					nodes: [
						node('a-uuid', 'A'),
						node('b-uuid', 'B'),
						node('merge-uuid', 'Merge', { disabled: true }),
						node('s-uuid', 'S'),
					],
					connections: {
						A: { main: [[main('Merge', 0)]] },
						B: { main: [[main('Merge', 1)]] },
						Merge: { main: [[main('S')]] },
					},
				}),
			);

			expect(graph.edges).toEqual([
				{ from: 'a-uuid', to: 's-uuid', outputIndex: 0, inputIndex: 0 },
			]);
		});

		it('ignores unsupported constructs on disabled nodes', () => {
			//    XX
			// ┌───────┐    ┌─┐
			// │Webhook├───►│A│    an unsupported trigger, but disabled
			// └───────┘    └─┘
			const graph = converter.convert(
				workflow({
					nodes: [
						node('webhook-uuid', 'Webhook', { type: 'n8n-nodes-base.webhook', disabled: true }),
						node('a-uuid', 'A'),
					],
					connections: { Webhook: { main: [[main('A')]] } },
				}),
			);

			expect(graph.nodes.map((n) => n.id)).toEqual(['a-uuid']);
			expect(graph.edges).toEqual([]);
		});
	});

	describe('loops', () => {
		it('maps Split In Batches to a batch step and marks its loop-back edge', () => {
			// ┌───────┐    ┌────┐ o0    ┌────┐
			// │trigger├───►│    ├──────►│Done│
			// └───────┘    │Loop│       └────┘
			//              │    │ o1    ┌────┐
			//              │    ├──────►│Body│
			//              └─▲──┘       └──┬─┘
			//                └───(back)────┘
			const graph = converter.convert(
				workflow({
					nodes: [
						manualTrigger,
						node('loop-uuid', 'Loop', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
						node('done-uuid', 'Done'),
						node('body-uuid', 'Body'),
					],
					connections: {
						'When clicking Execute': { main: [[main('Loop')]] },
						Loop: { main: [[main('Done')], [main('Body')]] },
						Body: { main: [[main('Loop')]] },
					},
				}),
			);

			// the engine runs a batch node itself, so its config is the batch size, not
			// the v1 node identity the shim carries for every other type
			expect(graph.nodes).toContainEqual({
				id: 'loop-uuid',
				name: 'Loop',
				type: 'batch',
				config: { batchSize: 1 },
			});
			expect(graph.edges).toEqual([
				{ from: 'trigger-uuid', to: 'loop-uuid', outputIndex: 0, inputIndex: 0 },
				{ from: 'loop-uuid', to: 'done-uuid', outputIndex: 0, inputIndex: 0 },
				{ from: 'loop-uuid', to: 'body-uuid', outputIndex: 1, inputIndex: 0 },
				{ from: 'body-uuid', to: 'loop-uuid', outputIndex: 0, inputIndex: 0, isBackEdge: true },
			]);
		});

		it('marks both back edges of nested loops, but not the loop-entry edge', () => {
			// ┌───────┐    ┌─────┐ o0    ┌───┐
			// │trigger├───►│     ├──────►│End│
			// └───────┘    │Outer│       └───┘
			//              │     │ o1    ┌─────┐ o0    ┌───────────┐
			//              │     ├──────►│     ├──────►│After Inner│
			//              └──▲──┘       │Inner│       └─────┬─────┘
			//                 │          │     │ o1    ┌────┐│
			//                 │          │     ├──────►│Body││
			//                 │          └──▲──┘       └──┬─┘│
			//                 │             └───(back)────┘  │
			//                 └───(back)─────────────────────┘
			const graph = converter.convert(
				workflow({
					nodes: [
						manualTrigger,
						node('outer-uuid', 'Outer', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
						node('inner-uuid', 'Inner', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
						node('body-uuid', 'Body'),
						node('after-inner-uuid', 'After Inner'),
						node('end-uuid', 'End'),
					],
					connections: {
						'When clicking Execute': { main: [[main('Outer')]] },
						Outer: { main: [[main('End')], [main('Inner')]] },
						Inner: { main: [[main('After Inner')], [main('Body')]] },
						Body: { main: [[main('Inner')]] },
						'After Inner': { main: [[main('Outer')]] },
					},
				}),
			);

			const backEdges = graph.edges.filter((edge) => edge.isBackEdge);
			expect(backEdges).toEqual([
				{ from: 'body-uuid', to: 'inner-uuid', outputIndex: 0, inputIndex: 0, isBackEdge: true },
				{
					from: 'after-inner-uuid',
					to: 'outer-uuid',
					outputIndex: 0,
					inputIndex: 0,
					isBackEdge: true,
				},
			]);
		});

		it('marks the loop-back edge of a rootless loop regardless of node order', () => {
			// ┌────┐ o1    ┌────┐
			// │Loop├──────►│Body│    nothing else points in
			// └─▲──┘       └──┬─┘
			//   └───(back)────┘
			const graph = converter.convert(
				workflow({
					nodes: [
						node('body-uuid', 'Body'),
						node('loop-uuid', 'Loop', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
					],
					connections: {
						Body: { main: [[main('Loop')]] },
						Loop: { main: [[], [main('Body')]] },
					},
				}),
			);

			expect(graph.edges).toEqual([
				{ from: 'body-uuid', to: 'loop-uuid', outputIndex: 0, inputIndex: 0, isBackEdge: true },
				{ from: 'loop-uuid', to: 'body-uuid', outputIndex: 1, inputIndex: 0 },
			]);
		});

		it('rejects a loop entered mid-body, regardless of node order', () => {
			// ┌──┐    ┌────┐ o1    ┌────┐    ┌──┐
			// │T1├───►│Loop├──────►│Body│◄───┤T2│
			// └──┘    └─▲──┘       └──┬─┘    └──┘
			//           └─────────────┘
			// two ways into the loop: through Loop (T1) and mid-body (T2)
			const t1 = node('t1-uuid', 'T1', { type: 'n8n-nodes-base.manualTrigger' });
			const t2 = node('t2-uuid', 'T2', { type: 'n8n-nodes-base.manualTrigger' });
			const loop = node('loop-uuid', 'Loop', {
				type: 'n8n-nodes-base.splitInBatches',
				typeVersion: 3,
			});
			const body = node('body-uuid', 'Body');
			const connections = {
				T1: { main: [[main('Loop')]] },
				T2: { main: [[main('Body')]] },
				Loop: { main: [[], [main('Body')]] },
				Body: { main: [[main('Loop')]] },
			};

			for (const nodes of [
				[t1, t2, loop, body],
				[t2, t1, loop, body],
			]) {
				expect(() => converter.convert(workflow({ nodes, connections }))).toThrow(
					UnsupportedLoopEntryError,
				);
			}
		});

		it('converts a loop fed by multiple triggers through its batch node', () => {
			// ┌──┐    ┌────┐ o1    ┌────┐
			// │T1├───►│    ├──────►│Body│
			// └──┘    │Loop│       └──┬─┘
			// ┌──┐    │    │          │
			// │T2├───►│    │◄─(back)──┘
			// └──┘    └────┘    one way in, used by both triggers
			const graph = converter.convert(
				workflow({
					nodes: [
						node('t1-uuid', 'T1', { type: 'n8n-nodes-base.manualTrigger' }),
						node('t2-uuid', 'T2', { type: 'n8n-nodes-base.manualTrigger' }),
						node('loop-uuid', 'Loop', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
						node('body-uuid', 'Body'),
					],
					connections: {
						T1: { main: [[main('Loop')]] },
						T2: { main: [[main('Loop')]] },
						Loop: { main: [[], [main('Body')]] },
						Body: { main: [[main('Loop')]] },
					},
				}),
			);

			const backEdges = graph.edges.filter((edge) => edge.isBackEdge);
			expect(backEdges).toEqual([
				{ from: 'body-uuid', to: 'loop-uuid', outputIndex: 0, inputIndex: 0, isBackEdge: true },
			]);
		});

		it('rejects a non-batch cycle nested inside a loop body', () => {
			// ┌───────┐    ┌────┐ o1    ┌─┐     ┌─┐
			// │trigger├───►│Loop├──────►│A├────►│B│
			// └───────┘    └─▲──┘       └▲┘     └┬┘
			//                │           └───────┤
			//                └───────────────────┘
			// B feeds both Loop and A, making A -> B -> A a cycle with no batch node
			expect(() =>
				converter.convert(
					workflow({
						nodes: [
							manualTrigger,
							node('loop-uuid', 'Loop', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
							node('a-uuid', 'A'),
							node('b-uuid', 'B'),
						],
						connections: {
							'When clicking Execute': { main: [[main('Loop')]] },
							Loop: { main: [[], [main('A')]] },
							A: { main: [[main('B')]] },
							B: { main: [[main('A'), main('Loop')]] },
						},
					}),
				),
			).toThrow(UnsupportedCycleError);
		});

		it('rejects an inner loop entered mid-body by the outer loop, regardless of edge order', () => {
			// ┌───────┐   ┌─────┐ o1      ┌─────┐ o1      ┌──┐
			// │trigger├──►│     ├────────►│     ├────────►│  │
			// └───────┘   │Outer│         │Inner│         │B1│
			//             │     │ o1      │     │◄────────┤  │
			//             │     ├────────────────────────►│  │
			//             └──▲──┘         └──┬──┘ o0      └──┘
			//                │               ▼
			//                │        ┌───────────┐
			//                └────────┤After Inner│
			//                         └───────────┘
			// Outer o1 fans out to both Inner and B1: two ways into the inner loop
			const nodes = [
				manualTrigger,
				node('outer-uuid', 'Outer', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
				node('inner-uuid', 'Inner', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
				node('b1-uuid', 'B1'),
				node('after-inner-uuid', 'After Inner'),
			];

			for (const outerLoopOutput of [
				[main('Inner'), main('B1')],
				[main('B1'), main('Inner')],
			]) {
				const connections = {
					'When clicking Execute': { main: [[main('Outer')]] },
					Outer: { main: [[], outerLoopOutput] },
					Inner: { main: [[main('After Inner')], [main('B1')]] },
					B1: { main: [[main('Inner')]] },
					'After Inner': { main: [[main('Outer')]] },
				};

				expect(() => converter.convert(workflow({ nodes, connections }))).toThrow(
					UnsupportedLoopEntryError,
				);
			}
		});

		it('rejects rootless nested loops as ambiguous, regardless of node order', () => {
			// ┌─────┐ o1    ┌─────┐ o0    ┌───────────┐
			// │     ├──────►│     ├──────►│After Inner│
			// │Outer│       │Inner│       └─────┬─────┘
			// │     │       │     │ o1    ┌────┐│
			// │     │       │     ├──────►│Body││
			// └──▲──┘       └──▲──┘       └──┬─┘│
			//    │             └─────────────┘  │
			//    └──────────────────────────────┘
			// no trigger anywhere: no way to tell which loop is the outer one
			expect(() =>
				converter.convert(
					workflow({
						nodes: [
							node('inner-uuid', 'Inner', {
								type: 'n8n-nodes-base.splitInBatches',
								typeVersion: 3,
							}),
							node('outer-uuid', 'Outer', {
								type: 'n8n-nodes-base.splitInBatches',
								typeVersion: 3,
							}),
							node('body-uuid', 'Body'),
							node('after-inner-uuid', 'After Inner'),
						],
						connections: {
							Outer: { main: [[], [main('Inner')]] },
							Inner: { main: [[main('After Inner')], [main('Body')]] },
							Body: { main: [[main('Inner')]] },
							'After Inner': { main: [[main('Outer')]] },
						},
					}),
				),
			).toThrow(UnsupportedLoopEntryError);
		});

		it('converts chained rootless loops, which have an unambiguous entry', () => {
			// ┌──┐ o1    ┌──┐        ┌──┐ o1    ┌──┐
			// │L1├──────►│B1│        │L2├──────►│B2│
			// └─▲┘       └┬─┘        └─▲┘       └┬─┘
			//   └─(back)──┘            └─(back)──┘
			// L1 -o0-> L2 chains the loops, no trigger anywhere
			const graph = converter.convert(
				workflow({
					nodes: [
						node('l2-uuid', 'L2', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
						node('l1-uuid', 'L1', { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 }),
						node('b1-uuid', 'B1'),
						node('b2-uuid', 'B2'),
					],
					connections: {
						L1: { main: [[main('L2')], [main('B1')]] },
						B1: { main: [[main('L1')]] },
						L2: { main: [[], [main('B2')]] },
						B2: { main: [[main('L2')]] },
					},
				}),
			);

			const backEdges = graph.edges.filter((edge) => edge.isBackEdge);
			expect(backEdges).toEqual([
				{ from: 'b1-uuid', to: 'l1-uuid', outputIndex: 0, inputIndex: 0, isBackEdge: true },
				{ from: 'b2-uuid', to: 'l2-uuid', outputIndex: 0, inputIndex: 0, isBackEdge: true },
			]);
		});

		it('rejects cycles that are not Split In Batches loops', () => {
			// ┌─┐     ┌─┐
			// │A├────►│B│
			// │ │◄────┤ │
			// └─┘     └─┘
			expect(() =>
				converter.convert(
					workflow({
						nodes: [node('a-uuid', 'A'), node('b-uuid', 'B')],
						connections: {
							A: { main: [[main('B')]] },
							B: { main: [[main('A')]] },
						},
					}),
				),
			).toThrow(UnsupportedCycleError);
		});
	});
});
