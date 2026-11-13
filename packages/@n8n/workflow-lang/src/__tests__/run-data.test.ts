import { createRequire } from 'node:module';
import { join } from 'node:path';

import type { StepStatusEvent } from '../canvas/run-data.ts';
import { RunDataAdapter, buildRunData, toWorkflowData } from '../canvas/run-data.ts';
import { compile } from '../compiler/index.ts';
import type { Canvas } from '../compiler/projection.ts';
import { PACKAGE_ROOT, corpusCase } from './helpers.ts';

function canvasOf(name: string): Canvas {
	const canvas = compile(corpusCase(name).source).canvas;
	if (!canvas) throw new Error('no canvas');
	return canvas;
}

let seq = 0;
function ev(
	stepId: string,
	status: StepStatusEvent['status'],
	extra: Partial<StepStatusEvent> = {},
): StepStatusEvent {
	seq += 1;
	return { executionId: 'e1', stepId, attempt: 0, seq, status, time: seq * 10, ...extra };
}

describe('run-data adapter', () => {
	it('turns loop iterations into several runs of one node, in any event order', () => {
		const canvas = canvasOf('02-loops');
		const events: StepStatusEvent[] = [];
		for (let i = 0; i < 3; i++) {
			events.push(ev('Fetch page', 'started', { occurrence: i }));
			events.push(
				ev('Fetch page', 'completed', { occurrence: i, data: { status: 200, body: { page: i } } }),
			);
		}
		events.push(ev('Poll job', 'started', { loopPosition: 0 }));
		const inOrder = buildRunData(events, canvas);
		const shuffled = buildRunData([...events].reverse().concat(events[2]), canvas);
		expect(shuffled).toEqual(inOrder);

		const runs = inOrder.runData['Fetch page'];
		expect(runs).toHaveLength(3);
		expect(runs.map((r) => r.executionStatus)).toEqual(['success', 'success', 'success']);
		expect(runs.map((r) => r.data?.main[0]?.[0]?.json)).toEqual([
			{ status: 200, body: { page: 0 } },
			{ status: 200, body: { page: 1 } },
			{ status: 200, body: { page: 2 } },
		]);
		expect(runs[0].executionTime).toBe(10);
		expect(runs[0].source).toEqual([{ previousNode: 'Transform', previousNodeOutput: 0 }]);
		expect(inOrder.statusByNodeId['Fetch page']).toBe('success');
		expect(inOrder.runningNodeIds).toEqual(['Poll job']);
	});

	it('shows parallel branches as several running nodes', () => {
		const canvas = canvasOf('07-promise-all-list');
		const adapter = new RunDataAdapter(canvas, 'e1');
		adapter.push(ev('Profile', 'started'));
		adapter.push(ev('Orders', 'started'));
		let state = adapter.push(ev('Score', 'started'));
		expect(state.runningNodeIds).toEqual(['Orders', 'Profile', 'Score']);
		state = adapter.push(ev('Score', 'completed', { data: [{ score: 1 }, { score: 2 }] }));
		expect(state.runData.Score[0].data?.main[0]).toEqual([
			{ json: { score: 1 } },
			{ json: { score: 2 } },
		]);
		expect(state.runningNodeIds).toEqual(['Orders', 'Profile']);
		expect(state.runData.Profile[0].executionIndex).toBe(0);
		expect(state.runData.Orders[0].executionIndex).toBe(1);
	});

	it('handles retries, failures, waiting and late events', () => {
		const canvas = canvasOf('01-order-approval');
		const started = ev('Charge', 'started');
		const retrying = ev('Charge', 'retrying', { data: { message: 'timeout' } });
		const again = ev('Charge', 'started', { attempt: 1 });
		const failed = ev('Charge', 'failed', { attempt: 1, data: { message: 'card declined' } });
		const waiting = ev('Approve short order', 'waiting');
		// The failure arrives first; the earlier events must not reset it.
		const out = buildRunData([failed, waiting, again, started, retrying], canvas);
		expect(out.runData.Charge).toHaveLength(1);
		expect(out.runData.Charge[0].executionStatus).toBe('error');
		expect(out.runData.Charge[0].error).toEqual({ name: 'NodeError', message: 'card declined' });
		expect(out.statusByNodeId).toEqual({ Charge: 'error', 'Approve short order': 'waiting' });
		expect(out.runningNodeIds).toEqual([]);
	});

	it('ignores other executions and unknown steps', () => {
		const canvas = canvasOf('01-order-approval');
		const other = { ...ev('Charge', 'started'), executionId: 'e2' };
		const unknown = ev('Nope', 'started');
		const out = buildRunData([other, unknown], canvas, 'e1');
		expect(out.runData).toEqual({});
		expect(out.ignored).toEqual([other, unknown]);
	});
});

/**
 * The editor mapping (`useCanvasMapping`, `canvas.utils.ts`) needs Vue, i18n
 * and the editor stores, so a node test cannot import it cheaply. These tests
 * check the projection against the types it reads (`INode`, `IConnections`,
 * `ITaskData`) and against the node types that nodes-base really has.
 */
describe('projection as editor workflow data', () => {
	const nodesBase = join(PACKAGE_ROOT, '..', '..', 'nodes-base');
	const require = createRequire(join(nodesBase, 'package.json'));
	const pkg: { n8n: { nodes: string[] } } = require('./package.json');
	const versionsOf = (type: string): number[] | null => {
		const name = type.replace(/^n8n-nodes-base\./, '');
		const file = pkg.n8n.nodes.find((p) => {
			const base = p.split('/').pop()?.replace('.node.js', '') ?? '';
			return base.charAt(0).toLowerCase() + base.slice(1) === name;
		});
		if (!file) return null;
		const mod: Record<
			string,
			new () => {
				description: { name: string; version: number | number[] };
				nodeVersions?: Record<string, unknown>;
			}
		> = require(`./${file}`);
		const instance = new (Object.values(mod)[0])();
		if (instance.description.name !== name) return null;
		return instance.nodeVersions
			? Object.keys(instance.nodeVersions).map(Number)
			: ([] as number[]).concat(instance.description.version);
	};

	it.each(['01-order-approval', '07-promise-all-list', '02-loops'])(
		'%s maps to real node types and valid connections',
		(name) => {
			const { nodes, connections } = toWorkflowData(canvasOf(name));
			const names = new Set(nodes.map((n) => n.name));
			expect(names.size).toBe(nodes.length);
			for (const node of nodes) {
				const versions = versionsOf(node.type);
				expect({ type: node.type, known: versions !== null }).toEqual({
					type: node.type,
					known: true,
				});
				expect(versions).toContain(node.typeVersion);
			}
			for (const [from, byType] of Object.entries(connections)) {
				expect(names.has(from)).toBe(true);
				const node = nodes.find((n) => n.name === from);
				byType.main.forEach((targets, output) => {
					for (const t of targets ?? []) {
						expect(names.has(t.node)).toBe(true);
						expect(t.type).toBe('main');
					}
					const maxOutputs =
						node?.type === 'n8n-nodes-base.switch'
							? 99
							: node?.type === 'n8n-nodes-base.if' ||
									node?.type === 'n8n-nodes-base.splitInBatches' ||
									node?.onError
								? 2
								: 1;
					expect(output).toBeLessThan(maxOutputs);
				});
			}
		},
	);
});
